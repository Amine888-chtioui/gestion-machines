<?php
// app/Http/Controllers/Api/MachineController.php - Version corrigée pour les images

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Machine;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class MachineController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = Machine::query();

            // Filtres
            if ($request->has('statut')) {
                $query->where('statut', $request->statut);
            }

            if ($request->has('localisation')) {
                $query->where('localisation', 'like', '%' . $request->localisation . '%');
            }

            if ($request->has('modele')) {
                $query->where('modele', 'like', '%' . $request->modele . '%');
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('nom', 'like', "%{$search}%")
                      ->orWhere('numero_serie', 'like', "%{$search}%")
                      ->orWhere('localisation', 'like', "%{$search}%");
                });
            }

            // Tri
            $sortBy = $request->get('sort_by', 'nom');
            $sortOrder = $request->get('sort_order', 'asc');
            $query->orderBy($sortBy, $sortOrder);

            // Relations
            $query->withCount(['composants', 'demandes']);

            // Pagination
            $perPage = $request->get('per_page', 15);
            $machines = $query->paginate($perPage);

            // Ajouter des données calculées et les URLs d'images
            $machines->getCollection()->transform(function ($machine) {
                // Ajouter l'URL complète de l'image
                if ($machine->image_path && Storage::disk('public')->exists($machine->image_path)) {
                    $machine->image_url = url('storage/' . $machine->image_path);
                    $machine->has_image = true;
                } else {
                    $machine->image_url = null;
                    $machine->has_image = false;
                }
                
                // Données calculées existantes
                $machine->append(['nombre_composants', 'statut_maintenance', 'temps_depuis_maintenance']);
                return $machine;
            });

            return response()->json([
                'message' => 'Machines récupérées avec succès',
                'data' => $machines
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des machines:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Erreur lors de la récupération des machines',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $machine = Machine::with([
                'composants.type',
                'demandes' => function($query) {
                    $query->latest()->take(10);
                },
                'demandes.user'
            ])->findOrFail($id);

            // Ajouter l'URL de l'image
            if ($machine->image_path && Storage::disk('public')->exists($machine->image_path)) {
                $machine->image_url = url('storage/' . $machine->image_path);
                $machine->has_image = true;
            } else {
                $machine->image_url = null;
                $machine->has_image = false;
            }

            // Ajouter des statistiques
            $machine->statistiques = [
                'composants_total' => $machine->composants->count(),
                'composants_bon' => $machine->composants->where('statut', 'bon')->count(),
                'composants_usure' => $machine->composants->where('statut', 'usure')->count(),
                'composants_defaillant' => $machine->composants->where('statut', 'defaillant')->count(),
                'demandes_en_attente' => $machine->demandes->where('statut', 'en_attente')->count(),
                'demandes_total' => $machine->demandes->count(),
            ];

            $machine->append(['statut_maintenance', 'temps_depuis_maintenance']);

            return response()->json([
                'message' => 'Machine récupérée avec succès',
                'data' => $machine
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération de la machine:', [
                'machine_id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'message' => 'Machine non trouvée',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    public function store(Request $request)
    {
        try {
            // Log des données reçues pour debug
            Log::info('Données reçues pour création machine:', [
                'request_data' => $request->except(['image']),
                'has_file' => $request->hasFile('image'),
                'content_type' => $request->header('Content-Type')
            ]);

            $rules = [
                'nom' => 'required|string|max:100',
                'numero_serie' => 'required|string|max:50|unique:machines,numero_serie',
                'modele' => 'nullable|string|max:50',
                'description' => 'nullable|string',
                'localisation' => 'nullable|string|max:100',
                'statut' => 'nullable|in:actif,inactif,maintenance',
                'date_installation' => 'nullable|date',
                'derniere_maintenance' => 'nullable|date',
                // CORRECTION: Accepter à la fois string et array pour specifications_techniques
                'specifications_techniques' => 'nullable',
            ];

            // Validation d'image plus stricte
            if ($request->hasFile('image')) {
                $rules['image'] = [
                    'required',
                    'image',
                    'mimes:jpeg,png,jpg,gif',
                    'max:2048', // 2MB max
                    'dimensions:min_width=100,min_height=100,max_width=2000,max_height=2000'
                ];
            }

            $validatedData = $request->validate($rules);

            // CORRECTION: Traitement amélioré de specifications_techniques
            if (isset($validatedData['specifications_techniques'])) {
                $specs = $validatedData['specifications_techniques'];
                
                if (is_string($specs)) {
                    // Si c'est une chaîne, essayer de décoder le JSON
                    $decodedSpecs = json_decode($specs, true);
                    $validatedData['specifications_techniques'] = $decodedSpecs ?: [];
                } elseif (is_array($specs)) {
                    // Si c'est déjà un tableau, le garder tel quel
                    $validatedData['specifications_techniques'] = $specs;
                } else {
                    // Valeur par défaut si null ou autre type
                    $validatedData['specifications_techniques'] = [];
                }
            } else {
                // Valeur par défaut si pas fourni
                $validatedData['specifications_techniques'] = [];
            }

            // Log du traitement des specifications
            Log::info('Traitement specifications_techniques:', [
                'original_type' => gettype($request->input('specifications_techniques')),
                'original_value' => $request->input('specifications_techniques'),
                'processed_value' => $validatedData['specifications_techniques']
            ]);

            // Gestion de l'upload d'image
            if ($request->hasFile('image')) {
                $imagePath = $this->uploadImage($request->file('image'));
                $validatedData['image_path'] = $imagePath;
                
                Log::info('Image uploadée pour machine:', [
                    'image_path' => $imagePath,
                    'file_size' => $request->file('image')->getSize()
                ]);
            }

            // Supprimer le champ image des données à sauvegarder
            unset($validatedData['image']);

            $machine = Machine::create($validatedData);
            
            // Ajouter l'URL de l'image à la réponse
            if ($machine->image_path && Storage::disk('public')->exists($machine->image_path)) {
                $machine->image_url = url('storage/' . $machine->image_path);
                $machine->has_image = true;
            } else {
                $machine->image_url = null;
                $machine->has_image = false;
            }

            Log::info('Machine créée avec succès:', [
                'machine_id' => $machine->id,
                'nom' => $machine->nom,
                'has_image' => $machine->has_image
            ]);

            return response()->json([
                'message' => 'Machine créée avec succès',
                'data' => $machine
            ], 201);

        } catch (ValidationException $e) {
            Log::error('Erreur de validation machine:', [
                'errors' => $e->errors(),
                'request_data' => $request->except(['image'])
            ]);
            
            return response()->json([
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Erreur création machine:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Erreur lors de la création de la machine',
                'error' => $e->getMessage()
            ], 500);
        }
    }

        public function update(Request $request, $id)
    {
        try {
            $machine = Machine::findOrFail($id);

            Log::info('Données reçues pour mise à jour machine:', [
                'machine_id' => $id,
                'request_data' => $request->except(['image']),
                'has_file' => $request->hasFile('image')
            ]);

            $rules = [
                'nom' => 'sometimes|string|max:100',
                'numero_serie' => 'sometimes|string|max:50|unique:machines,numero_serie,' . $id,
                'modele' => 'sometimes|string|max:50',
                'description' => 'nullable|string',
                'localisation' => 'nullable|string|max:100',
                'statut' => 'sometimes|in:actif,inactif,maintenance',
                'date_installation' => 'nullable|date',
                'derniere_maintenance' => 'nullable|date',
                // CORRECTION: Même logique pour update
                'specifications_techniques' => 'nullable',
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

            // CORRECTION: Même traitement pour update
            if (isset($validatedData['specifications_techniques'])) {
                $specs = $validatedData['specifications_techniques'];
                
                if (is_string($specs)) {
                    $decodedSpecs = json_decode($specs, true);
                    $validatedData['specifications_techniques'] = $decodedSpecs ?: [];
                } elseif (is_array($specs)) {
                    $validatedData['specifications_techniques'] = $specs;
                } else {
                    $validatedData['specifications_techniques'] = [];
                }
            }

            // Gestion de l'upload d'image
            if ($request->hasFile('image')) {
                // Supprimer l'ancienne image
                $this->deleteImageFile($machine->image_path);
                
                // Uploader la nouvelle image
                $imagePath = $this->uploadImage($request->file('image'));
                $validatedData['image_path'] = $imagePath;
                
                Log::info('Image mise à jour pour machine:', [
                    'machine_id' => $id,
                    'new_image_path' => $imagePath
                ]);
            }

            // Supprimer le champ image des données à sauvegarder
            unset($validatedData['image']);

            $machine->update($validatedData);
            
            // Ajouter l'URL de l'image à la réponse
            if ($machine->image_path && Storage::disk('public')->exists($machine->image_path)) {
                $machine->image_url = url('storage/' . $machine->image_path);
                $machine->has_image = true;
            } else {
                $machine->image_url = null;
                $machine->has_image = false;
            }

            return response()->json([
                'message' => 'Machine mise à jour avec succès',
                'data' => $machine
            ]);

        } catch (ValidationException $e) {
            Log::error('Erreur de validation mise à jour machine:', [
                'machine_id' => $id,
                'errors' => $e->errors()
            ]);
            
            return response()->json([
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Erreur mise à jour machine:', [
                'machine_id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'message' => 'Erreur lors de la mise à jour de la machine',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Méthode privée pour gérer l'upload d'image (améliorée)
    private function uploadImage($image)
    {
        try {
            // Vérifier que le dossier existe
            if (!Storage::disk('public')->exists('machines')) {
                Storage::disk('public')->makeDirectory('machines');
                Log::info('Dossier machines créé');
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
            $fileName = 'machine_' . time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
            
            // Stocker l'image dans le dossier public/machines
            $imagePath = $image->storeAs('machines', $fileName, 'public');
            
            // Vérifier que l'image a bien été stockée
            if (!Storage::disk('public')->exists($imagePath)) {
                throw new \Exception('Échec de l\'enregistrement de l\'image');
            }
            
            Log::info('Image uploadée avec succès:', [
                'original_name' => $image->getClientOriginalName(),
                'stored_path' => $imagePath,
                'stored_name' => $fileName,
                'file_size' => $image->getSize(),
                'mime_type' => $image->getMimeType(),
                'full_url' => url('storage/' . $imagePath)
            ]);
            
            return $imagePath;
        } catch (\Exception $e) {
            Log::error('Erreur upload image:', [
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
            Log::info('Image supprimée:', ['path' => $imagePath]);
        }
    }

    // Méthode pour supprimer uniquement l'image d'une machine
    public function deleteImage($id)
    {
        try {
            $machine = Machine::findOrFail($id);
            
            if ($machine->image_path) {
                $this->deleteImageFile($machine->image_path);
                $machine->update(['image_path' => null]);
                
                Log::info('Image supprimée avec succès:', [
                    'machine_id' => $id,
                    'image_path' => $machine->image_path
                ]);
                
                return response()->json([
                    'message' => 'Image supprimée avec succès'
                ]);
            }
            
            return response()->json([
                'message' => 'Aucune image à supprimer'
            ], 404);

        } catch (\Exception $e) {
            Log::error('Erreur suppression image machine:', [
                'machine_id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'message' => 'Erreur lors de la suppression de l\'image',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $machine = Machine::findOrFail($id);

            // Vérifier s'il y a des composants ou demandes associés
            if ($machine->composants()->count() > 0) {
                return response()->json([
                    'message' => 'Impossible de supprimer cette machine car elle contient des composants'
                ], 409);
            }

            if ($machine->demandes()->count() > 0) {
                return response()->json([
                    'message' => 'Impossible de supprimer cette machine car elle a des demandes associées'
                ], 409);
            }

            // Supprimer l'image associée
            $this->deleteImageFile($machine->image_path);
            
            $machine->delete();

            return response()->json([
                'message' => 'Machine supprimée avec succès'
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur suppression machine:', [
                'machine_id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'message' => 'Erreur lors de la suppression de la machine',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getActives()
    {
        try {
            $machines = Machine::actives()
                ->orderBy('nom')
                ->get(['id', 'nom', 'numero_serie', 'localisation', 'image_path']);

            $machines->transform(function ($machine) {
                if ($machine->image_path && Storage::disk('public')->exists($machine->image_path)) {
                    $machine->image_url = url('storage/' . $machine->image_path);
                    $machine->has_image = true;
                } else {
                    $machine->image_url = null;
                    $machine->has_image = false;
                }
                return $machine;
            });

            return response()->json([
                'message' => 'Machines actives récupérées avec succès',
                'data' => $machines
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur récupération machines actives:', [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'message' => 'Erreur lors de la récupération des machines actives',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function updateStatut(Request $request, $id)
    {
        try {
            $machine = Machine::findOrFail($id);

            $request->validate([
                'statut' => 'required|in:actif,inactif,maintenance'
            ]);

            $ancienStatut = $machine->statut;
            $machine->update(['statut' => $request->statut]);

            if ($request->statut === 'maintenance' && $ancienStatut !== 'maintenance') {
                Notification::notifierMaintenanceMachine($machine);
            }

            return response()->json([
                'message' => 'Statut de la machine mis à jour avec succès',
                'data' => $machine
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

    public function updateMaintenance(Request $request, $id)
    {
        try {
            $machine = Machine::findOrFail($id);

            $request->validate([
                'derniere_maintenance' => 'required|date'
            ]);

            $machine->update([
                'derniere_maintenance' => $request->derniere_maintenance,
                'statut' => 'actif'
            ]);

            return response()->json([
                'message' => 'Date de maintenance mise à jour avec succès',
                'data' => $machine
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors de la mise à jour de la maintenance',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function statistiques()
    {
        try {
            $stats = [
                'total' => Machine::count(),
                'actives' => Machine::where('statut', 'actif')->count(),
                'inactives' => Machine::where('statut', 'inactif')->count(),
                'en_maintenance' => Machine::where('statut', 'maintenance')->count(),
                'necessitent_maintenance' => Machine::necessiteMaintenace()->count(),
                'avec_composants_defaillants' => Machine::whereHas('composants', function($query) {
                    $query->where('statut', 'defaillant');
                })->count(),
                'avec_images' => Machine::whereNotNull('image_path')->count(),
            ];

            return response()->json([
                'message' => 'Statistiques des machines récupérées avec succès',
                'data' => $stats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors du calcul des statistiques',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getComposants($id)
    {
        try {
            $machine = Machine::findOrFail($id);
            
            $composants = $machine->composants()
                ->with('type')
                ->orderBy('nom')
                ->get();

            return response()->json([
                'message' => 'Composants de la machine récupérés avec succès',
                'data' => $composants
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors de la récupération des composants',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getDemandes($id)
    {
        try {
            $machine = Machine::findOrFail($id);
            
            $demandes = $machine->demandes()
                ->with(['user', 'composant'])
                ->orderBy('created_at', 'desc')
                ->paginate(10);

            return response()->json([
                'message' => 'Demandes de la machine récupérées avec succès',
                'data' => $demandes
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors de la récupération des demandes',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Méthode pour vérifier et réparer les URLs d'images
    public function checkImages()
    {
        try {
            $machines = Machine::whereNotNull('image_path')->get();
            $repaired = 0;
            $errors = 0;

            foreach ($machines as $machine) {
                if (!Storage::disk('public')->exists($machine->image_path)) {
                    Log::warning('Image manquante pour machine:', [
                        'machine_id' => $machine->id,
                        'image_path' => $machine->image_path
                    ]);
                    
                    // Optionnel: nettoyer le chemin d'image invalide
                    $machine->update(['image_path' => null]);
                    $errors++;
                } else {
                    $repaired++;
                }
            }

            return response()->json([
                'message' => 'Vérification des images terminée',
                'data' => [
                    'total_machines_with_images' => $machines->count(),
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