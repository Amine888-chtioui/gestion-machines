<?php
// app/Http/Controllers/Api/ComposantController.php - Version mise à jour avec gestion d'images

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Composant;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class ComposantController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = Composant::with(['machine', 'type']);

            // Filtres
            if ($request->has('machine_id')) {
                $query->where('machine_id', $request->machine_id);
            }

            if ($request->has('type_id')) {
                $query->where('type_id', $request->type_id);
            }

            if ($request->has('statut')) {
                $query->where('statut', $request->statut);
            }

            if ($request->has('fournisseur')) {
                $query->where('fournisseur', 'like', '%' . $request->fournisseur . '%');
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('nom', 'like', "%{$search}%")
                      ->orWhere('reference', 'like', "%{$search}%")
                      ->orWhere('fournisseur', 'like', "%{$search}%");
                });
            }

            // Filtres spéciaux
            if ($request->has('defaillants') && $request->boolean('defaillants')) {
                $query->defaillants();
            }

            if ($request->has('a_inspecter') && $request->boolean('a_inspecter')) {
                $query->aInspecter();
            }

            if ($request->has('usures') && $request->boolean('usures')) {
                $query->usures();
            }

            // Tri
            $sortBy = $request->get('sort_by', 'nom');
            $sortOrder = $request->get('sort_order', 'asc');
            $query->orderBy($sortBy, $sortOrder);

            // Pagination
            $perPage = $request->get('per_page', 15);
            $composants = $query->paginate($perPage);

            // Ajouter des données calculées et les URLs d'images
            $composants->getCollection()->transform(function ($composant) {
                // Ajouter l'URL complète de l'image
                if ($composant->image_path && Storage::disk('public')->exists($composant->image_path)) {
                    $composant->image_url = url('storage/' . $composant->image_path);
                    $composant->has_image = true;
                } else {
                    $composant->image_url = null;
                    $composant->has_image = false;
                }
                
                $composant->append(['prix_total', 'age', 'statut_inspection', 'pourcentage_vie']);
                return $composant;
            });

            return response()->json([
                'message' => 'Composants récupérés avec succès',
                'data' => $composants
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des composants:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Erreur lors de la récupération des composants',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            Log::info('Données reçues pour création composant:', [
                'request_data' => $request->except(['image']),
                'has_file' => $request->hasFile('image'),
                'content_type' => $request->header('Content-Type')
            ]);

            $rules = [
                'nom' => 'required|string|max:100',
                'reference' => 'required|string|max:50|unique:composants,reference',
                'machine_id' => 'required|exists:machines,id',
                'type_id' => 'required|exists:types,id',
                'description' => 'nullable|string',
                'statut' => 'sometimes|in:bon,usure,defaillant,remplace',
                'quantite' => 'required|integer|min:1',
                'prix_unitaire' => 'nullable|numeric|min:0',
                'fournisseur' => 'nullable|string|max:100',
                'date_installation' => 'nullable|date',
                'derniere_inspection' => 'nullable|date',
                'prochaine_inspection' => 'nullable|date|after:derniere_inspection',
                'duree_vie_estimee' => 'nullable|integer|min:1',
                'notes' => 'nullable|string',
                'caracteristiques' => 'nullable|string',
            ];

            // Validation d'image
            if ($request->hasFile('image')) {
                $rules['image'] = [
                    'required',
                    'image',
                    'mimes:jpeg,png,jpg,gif',
                    'max:2048',
                    'dimensions:min_width=100,min_height=100,max_width=2000,max_height=2000'
                ];
            }

            $validatedData = $request->validate($rules);

            // Traiter caracteristiques si c'est du JSON
            if (isset($validatedData['caracteristiques'])) {
                $specs = $validatedData['caracteristiques'];
                if (is_string($specs)) {
                    $decodedSpecs = json_decode($specs, true);
                    $validatedData['caracteristiques'] = $decodedSpecs ?: [];
                }
            }

            // Gestion de l'upload d'image
            if ($request->hasFile('image')) {
                $imagePath = $this->uploadImage($request->file('image'));
                $validatedData['image_path'] = $imagePath;
                
                Log::info('Image uploadée pour composant:', [
                    'image_path' => $imagePath,
                    'file_size' => $request->file('image')->getSize()
                ]);
            }

            // Supprimer le champ image des données à sauvegarder
            unset($validatedData['image']);

            $composant = Composant::create($validatedData);
            $composant->load(['machine', 'type']);
            
            // Ajouter l'URL de l'image à la réponse
            if ($composant->image_path && Storage::disk('public')->exists($composant->image_path)) {
                $composant->image_url = url('storage/' . $composant->image_path);
                $composant->has_image = true;
            } else {
                $composant->image_url = null;
                $composant->has_image = false;
            }

            return response()->json([
                'message' => 'Composant créé avec succès',
                'data' => $composant
            ], 201);

        } catch (ValidationException $e) {
            Log::error('Erreur de validation composant:', [
                'errors' => $e->errors(),
                'request_data' => $request->except(['image'])
            ]);
            
            return response()->json([
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Erreur création composant:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Erreur lors de la création du composant',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $composant = Composant::with([
                'machine',
                'type',
                'demandes' => function($query) {
                    $query->latest()->take(10);
                },
                'demandes.user'
            ])->findOrFail($id);

            // Ajouter l'URL de l'image
            if ($composant->image_path && Storage::disk('public')->exists($composant->image_path)) {
                $composant->image_url = url('storage/' . $composant->image_path);
                $composant->has_image = true;
            } else {
                $composant->image_url = null;
                $composant->has_image = false;
            }

            $composant->append(['prix_total', 'age', 'statut_inspection', 'pourcentage_vie']);

            return response()->json([
                'message' => 'Composant récupéré avec succès',
                'data' => $composant
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération du composant:', [
                'composant_id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'message' => 'Composant non trouvé',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $composant = Composant::findOrFail($id);

            Log::info('Données reçues pour mise à jour composant:', [
                'composant_id' => $id,
                'request_data' => $request->except(['image']),
                'has_file' => $request->hasFile('image')
            ]);

            $rules = [
                'nom' => 'sometimes|string|max:100',
                'reference' => 'sometimes|string|max:50|unique:composants,reference,' . $id,
                'machine_id' => 'sometimes|exists:machines,id',
                'type_id' => 'sometimes|exists:types,id',
                'description' => 'nullable|string',
                'statut' => 'sometimes|in:bon,usure,defaillant,remplace',
                'quantite' => 'sometimes|integer|min:1',
                'prix_unitaire' => 'nullable|numeric|min:0',
                'fournisseur' => 'nullable|string|max:100',
                'date_installation' => 'nullable|date',
                'derniere_inspection' => 'nullable|date',
                'prochaine_inspection' => 'nullable|date',
                'duree_vie_estimee' => 'nullable|integer|min:1',
                'notes' => 'nullable|string',
                'caracteristiques' => 'nullable|string',
            ];

            // Validation d'image
            if ($request->hasFile('image')) {
                $rules['image'] = [
                    'required',
                    'image',
                    'mimes:jpeg,png,jpg,gif',
                    'max:2048',
                    'dimensions:min_width=100,min_height=100,max_width=2000,max_height=2000'
                ];
            }

            $validatedData = $request->validate($rules);

            // Traiter caracteristiques
            if (isset($validatedData['caracteristiques'])) {
                $specs = $validatedData['caracteristiques'];
                if (is_string($specs)) {
                    $decodedSpecs = json_decode($specs, true);
                    $validatedData['caracteristiques'] = $decodedSpecs ?: [];
                }
            }

            // Gestion de l'upload d'image
            if ($request->hasFile('image')) {
                // Supprimer l'ancienne image
                $this->deleteImageFile($composant->image_path);
                
                // Uploader la nouvelle image
                $imagePath = $this->uploadImage($request->file('image'));
                $validatedData['image_path'] = $imagePath;
                
                Log::info('Image mise à jour pour composant:', [
                    'composant_id' => $id,
                    'new_image_path' => $imagePath
                ]);
            }

            // Supprimer le champ image des données à sauvegarder
            unset($validatedData['image']);

            $ancienStatut = $composant->statut;
            $composant->update($validatedData);

            // Si le composant devient défaillant, créer une notification
            if ($request->has('statut') && $request->statut === 'defaillant' && $ancienStatut !== 'defaillant') {
                Notification::notifierComposantDefaillant($composant);
            }

            $composant->load(['machine', 'type']);
            
            // Ajouter l'URL de l'image à la réponse
            if ($composant->image_path && Storage::disk('public')->exists($composant->image_path)) {
                $composant->image_url = url('storage/' . $composant->image_path);
                $composant->has_image = true;
            } else {
                $composant->image_url = null;
                $composant->has_image = false;
            }

            return response()->json([
                'message' => 'Composant mis à jour avec succès',
                'data' => $composant
            ]);

        } catch (ValidationException $e) {
            Log::error('Erreur de validation mise à jour composant:', [
                'composant_id' => $id,
                'errors' => $e->errors()
            ]);
            
            return response()->json([
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Erreur mise à jour composant:', [
                'composant_id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'message' => 'Erreur lors de la mise à jour du composant',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $composant = Composant::findOrFail($id);

            // Vérifier s'il y a des demandes associées
            if ($composant->demandes()->count() > 0) {
                return response()->json([
                    'message' => 'Impossible de supprimer ce composant car il a des demandes associées'
                ], 409);
            }

            // Supprimer l'image associée
            $this->deleteImageFile($composant->image_path);
            
            $composant->delete();

            return response()->json([
                'message' => 'Composant supprimé avec succès'
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur suppression composant:', [
                'composant_id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'message' => 'Erreur lors de la suppression du composant',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Méthode pour supprimer uniquement l'image d'un composant
    public function deleteImage($id)
    {
        try {
            $composant = Composant::findOrFail($id);
            
            if ($composant->image_path) {
                $this->deleteImageFile($composant->image_path);
                $composant->update(['image_path' => null]);
                
                Log::info('Image composant supprimée avec succès:', [
                    'composant_id' => $id,
                    'image_path' => $composant->image_path
                ]);
                
                return response()->json([
                    'message' => 'Image supprimée avec succès'
                ]);
            }
            
            return response()->json([
                'message' => 'Aucune image à supprimer'
            ], 404);

        } catch (\Exception $e) {
            Log::error('Erreur suppression image composant:', [
                'composant_id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'message' => 'Erreur lors de la suppression de l\'image',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Méthode privée pour gérer l'upload d'image
    private function uploadImage($image)
    {
        try {
            // Vérifier que le dossier existe
            if (!Storage::disk('public')->exists('composants')) {
                Storage::disk('public')->makeDirectory('composants');
                Log::info('Dossier composants créé');
            }

            // Valider l'image
            $allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
            if (!in_array($image->getMimeType(), $allowedMimes)) {
                throw new \Exception('Type de fichier non autorisé: ' . $image->getMimeType());
            }

            // Vérifier la taille
            if ($image->getSize() > 2048 * 1024) { // 2MB
                throw new \Exception('Fichier trop volumineux: ' . round($image->getSize() / 1024 / 1024, 2) . 'MB');
            }

            // Générer un nom unique pour l'image
            $fileName = 'composant_' . time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
            
            // Stocker l'image dans le dossier public/composants
            $imagePath = $image->storeAs('composants', $fileName, 'public');
            
            // Vérifier que l'image a bien été stockée
            if (!Storage::disk('public')->exists($imagePath)) {
                throw new \Exception('Échec de l\'enregistrement de l\'image');
            }
            
            Log::info('Image composant uploadée avec succès:', [
                'original_name' => $image->getClientOriginalName(),
                'stored_path' => $imagePath,
                'stored_name' => $fileName,
                'file_size' => $image->getSize(),
                'mime_type' => $image->getMimeType(),
                'full_url' => url('storage/' . $imagePath)
            ]);
            
            return $imagePath;
        } catch (\Exception $e) {
            Log::error('Erreur upload image composant:', [
                'error' => $e->getMessage(),
                'file_info' => [
                    'name' => $image->getClientOriginalName(),
                    'size' => $image->getSize(),
                    'mime' => $image->getMimeType()
                ]
            ]);
            throw $e;
        }
    }

    // Méthode pour supprimer un fichier image
    private function deleteImageFile($imagePath)
    {
        if ($imagePath && Storage::disk('public')->exists($imagePath)) {
            Storage::disk('public')->delete($imagePath);
            Log::info('Image composant supprimée:', ['path' => $imagePath]);
        }
    }

    public function updateStatut(Request $request, $id)
    {
        try {
            $composant = Composant::findOrFail($id);

            $request->validate([
                'statut' => 'required|in:bon,usure,defaillant,remplace',
                'notes' => 'nullable|string'
            ]);

            $ancienStatut = $composant->statut;
            
            $composant->update([
                'statut' => $request->statut,
                'notes' => $request->notes ?? $composant->notes
            ]);

            // Notification si défaillant
            if ($request->statut === 'defaillant' && $ancienStatut !== 'defaillant') {
                Notification::notifierComposantDefaillant($composant);
            }

            return response()->json([
                'message' => 'Statut du composant mis à jour avec succès',
                'data' => $composant
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors de la mise à jour du statut',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function updateInspection(Request $request, $id)
    {
        try {
            $composant = Composant::findOrFail($id);

            $request->validate([
                'derniere_inspection' => 'required|date',
                'prochaine_inspection' => 'nullable|date|after:derniere_inspection',
                'statut' => 'sometimes|in:bon,usure,defaillant,remplace',
                'notes' => 'nullable|string'
            ]);

            $data = $request->only(['derniere_inspection', 'prochaine_inspection', 'notes']);
            
            if ($request->has('statut')) {
                $data['statut'] = $request->statut;
            }

            $composant->update($data);

            return response()->json([
                'message' => 'Inspection du composant mise à jour avec succès',
                'data' => $composant
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors de la mise à jour de l\'inspection',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function statistiques()
    {
        try {
            $stats = [
                'total' => Composant::count(),
                'bon' => Composant::where('statut', 'bon')->count(),
                'usure' => Composant::where('statut', 'usure')->count(),
                'defaillant' => Composant::where('statut', 'defaillant')->count(),
                'remplace' => Composant::where('statut', 'remplace')->count(),
                'a_inspecter' => Composant::aInspecter()->count(),
                'valeur_totale' => Composant::sum(DB::raw('prix_unitaire * quantite')),
                'avec_images' => Composant::whereNotNull('image_path')->count(),
            ];

            return response()->json([
                'message' => 'Statistiques des composants récupérées avec succès',
                'data' => $stats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors du calcul des statistiques',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getDefaillants()
    {
        try {
            $composants = Composant::defaillants()
                ->with(['machine', 'type'])
                ->orderBy('updated_at', 'desc')
                ->get();

            // Ajouter les URLs d'images
            $composants->transform(function ($composant) {
                if ($composant->image_path && Storage::disk('public')->exists($composant->image_path)) {
                    $composant->image_url = url('storage/' . $composant->image_path);
                    $composant->has_image = true;
                } else {
                    $composant->image_url = null;
                    $composant->has_image = false;
                }
                return $composant;
            });

            return response()->json([
                'message' => 'Composants défaillants récupérés avec succès',
                'data' => $composants
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors de la récupération des composants défaillants',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getAInspecter()
    {
        try {
            $composants = Composant::aInspecter()
                ->with(['machine', 'type'])
                ->orderBy('prochaine_inspection')
                ->get();

            $composants->transform(function ($composant) {
                // Ajouter l'URL de l'image
                if ($composant->image_path && Storage::disk('public')->exists($composant->image_path)) {
                    $composant->image_url = url('storage/' . $composant->image_path);
                    $composant->has_image = true;
                } else {
                    $composant->image_url = null;
                    $composant->has_image = false;
                }
                
                $composant->append(['statut_inspection']);
                return $composant;
            });

            return response()->json([
                'message' => 'Composants à inspecter récupérés avec succès',
                'data' => $composants
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors de la récupération des composants à inspecter',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Méthode pour vérifier et réparer les URLs d'images
    public function checkImages()
    {
        try {
            $composants = Composant::whereNotNull('image_path')->get();
            $repaired = 0;
            $errors = 0;

            foreach ($composants as $composant) {
                if (!Storage::disk('public')->exists($composant->image_path)) {
                    Log::warning('Image manquante pour composant:', [
                        'composant_id' => $composant->id,
                        'image_path' => $composant->image_path
                    ]);
                    
                    // Optionnel: nettoyer le chemin d'image invalide
                    $composant->update(['image_path' => null]);
                    $errors++;
                } else {
                    $repaired++;
                }
            }

            return response()->json([
                'message' => 'Vérification des images terminée',
                'data' => [
                    'total_composants_with_images' => $composants->count(),
                    'images_valides' => $repaired,
                    'images_manquantes' => $errors
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors de la vérification des images',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}