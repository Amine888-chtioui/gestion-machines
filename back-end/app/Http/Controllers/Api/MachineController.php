<?php
// app/Http/Controllers/Api/MachineController.php - Version corrigée

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
    public function store(Request $request)
    {
        try {
            // Log des données reçues pour debug
            Log::info('Données reçues pour création machine:', [
                'request_data' => $request->all(),
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
                'specifications_techniques' => 'nullable|string', // Changer en string pour JSON
            ];

            // Ajouter la validation d'image seulement si un fichier est présent
            if ($request->hasFile('image')) {
                $rules['image'] = 'image|mimes:jpeg,png,jpg,gif|max:2048';
            }

            $validatedData = $request->validate($rules);

            // Traiter specifications_techniques si c'est du JSON
            if (isset($validatedData['specifications_techniques'])) {
                $specs = $validatedData['specifications_techniques'];
                if (is_string($specs)) {
                    $decodedSpecs = json_decode($specs, true);
                    $validatedData['specifications_techniques'] = $decodedSpecs ?: [];
                }
            }

            // Gestion de l'upload d'image
            if ($request->hasFile('image')) {
                $imagePath = $this->uploadImage($request->file('image'));
                $validatedData['image_path'] = $imagePath;
            }

            // Supprimer le champ image des données à sauvegarder
            unset($validatedData['image']);

            $machine = Machine::create($validatedData);
            $machine->append(['image_url', 'has_image']);

            return response()->json([
                'message' => 'Machine créée avec succès',
                'data' => $machine
            ], 201);

        } catch (ValidationException $e) {
            Log::error('Erreur de validation machine:', [
                'errors' => $e->errors(),
                'request_data' => $request->all()
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
                'request_data' => $request->all(),
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
                'specifications_techniques' => 'nullable|string',
            ];

            // Ajouter la validation d'image seulement si un fichier est présent
            if ($request->hasFile('image')) {
                $rules['image'] = 'image|mimes:jpeg,png,jpg,gif|max:2048';
            }

            $validatedData = $request->validate($rules);

            // Traiter specifications_techniques si c'est du JSON
            if (isset($validatedData['specifications_techniques'])) {
                $specs = $validatedData['specifications_techniques'];
                if (is_string($specs)) {
                    $decodedSpecs = json_decode($specs, true);
                    $validatedData['specifications_techniques'] = $decodedSpecs ?: [];
                }
            }

            // Gestion de l'upload d'image
            if ($request->hasFile('image')) {
                // Supprimer l'ancienne image
                $machine->deleteOldImage();
                
                // Uploader la nouvelle image
                $imagePath = $this->uploadImage($request->file('image'));
                $validatedData['image_path'] = $imagePath;
            }

            // Supprimer le champ image des données à sauvegarder
            unset($validatedData['image']);

            $machine->update($validatedData);
            $machine->append(['image_url', 'has_image']);

            return response()->json([
                'message' => 'Machine mise à jour avec succès',
                'data' => $machine
            ]);

        } catch (ValidationException $e) {
            Log::error('Erreur de validation mise à jour machine:', [
                'machine_id' => $id,
                'errors' => $e->errors(),
                'request_data' => $request->all()
            ]);
            
            return response()->json([
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Erreur mise à jour machine:', [
                'machine_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Erreur lors de la mise à jour de la machine',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Méthode privée pour gérer l'upload d'image (corrigée)
    private function uploadImage($image)
    {
        try {
            // Vérifier que le dossier existe
            if (!Storage::disk('public')->exists('machines')) {
                Storage::disk('public')->makeDirectory('machines');
            }

            // Générer un nom unique pour l'image
            $fileName = time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
            
            // Stocker l'image dans le dossier public/machines
            $imagePath = $image->storeAs('machines', $fileName, 'public');
            
            Log::info('Image uploadée avec succès:', [
                'original_name' => $image->getClientOriginalName(),
                'stored_path' => $imagePath,
                'file_size' => $image->getSize()
            ]);
            
            return $imagePath;
        } catch (\Exception $e) {
            Log::error('Erreur upload image:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    // Nouvelle méthode pour supprimer uniquement l'image
    public function deleteImage($id)
    {
        try {
            $machine = Machine::findOrFail($id);
            
            if ($machine->image_path) {
                $machine->deleteOldImage();
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

    // Toutes les autres méthodes restent identiques...
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

            // Ajouter des données calculées et l'URL de l'image
            $machines->getCollection()->transform(function ($machine) {
                $machine->append(['nombre_composants', 'statut_maintenance', 'temps_depuis_maintenance', 'image_url', 'has_image']);
                return $machine;
            });

            return response()->json([
                'message' => 'Machines récupérées avec succès',
                'data' => $machines
            ]);

        } catch (\Exception $e) {
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

            // Ajouter des statistiques
            $machine->statistiques = [
                'composants_total' => $machine->composants->count(),
                'composants_bon' => $machine->composants->where('statut', 'bon')->count(),
                'composants_usure' => $machine->composants->where('statut', 'usure')->count(),
                'composants_defaillant' => $machine->composants->where('statut', 'defaillant')->count(),
                'demandes_en_attente' => $machine->demandes->where('statut', 'en_attente')->count(),
                'demandes_total' => $machine->demandes->count(),
            ];

            $machine->append(['statut_maintenance', 'temps_depuis_maintenance', 'image_url', 'has_image']);

            return response()->json([
                'message' => 'Machine récupérée avec succès',
                'data' => $machine
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Machine non trouvée',
                'error' => $e->getMessage()
            ], 404);
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

            // L'image sera automatiquement supprimée grâce à l'événement boot() du modèle
            $machine->delete();

            return response()->json([
                'message' => 'Machine supprimée avec succès'
            ]);

        } catch (\Exception $e) {
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
                $machine->append(['image_url', 'has_image']);
                return $machine;
            });

            return response()->json([
                'message' => 'Machines actives récupérées avec succès',
                'data' => $machines
            ]);

        } catch (\Exception $e) {
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
}