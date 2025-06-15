<?php
// app/Http/Controllers/Api/ComposantController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Composant;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class ComposantController extends Controller
{
    public function index(Request $request)
    {
        $query = Composant::with(['machine', 'type']);

        // Filtres simples
        if ($request->machine_id) $query->where('machine_id', $request->machine_id);
        if ($request->type_id) $query->where('type_id', $request->type_id);
        if ($request->statut) $query->where('statut', $request->statut);
        if ($request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('nom', 'like', "%{$search}%")
                  ->orWhere('reference', 'like', "%{$search}%");
            });
        }

        // Filtres spéciaux
        if ($request->boolean('defaillants')) $query->where('statut', 'defaillant');
        if ($request->boolean('a_inspecter')) {
            $query->where('prochaine_inspection', '<=', now()->addDays(7));
        }

        // Tri et pagination
        $sortBy = $request->get('sort_by', 'nom');
        $sortOrder = $request->get('sort_order', 'asc');
        $perPage = $request->get('per_page', 15);

        $composants = $query->orderBy($sortBy, $sortOrder)->paginate($perPage);

        // Ajouter URLs images
        $composants->getCollection()->transform(function ($composant) {
            $this->addImageUrl($composant);
            return $composant;
        });

        return response()->json([
            'message' => 'Composants récupérés avec succès',
            'data' => $composants
        ]);
    }

    public function show($id)
    {
        $composant = Composant::with([
            'machine', 'type',
            'demandes' => fn($q) => $q->latest()->take(10),
            'demandes.user'
        ])->findOrFail($id);

        $this->addImageUrl($composant);

        return response()->json([
            'message' => 'Composant récupéré avec succès',
            'data' => $composant
        ]);
    }

    public function store(Request $request)
{
    $rules = [
        'nom' => 'required|string|max:100',
        'reference' => 'required|string|max:50|unique:composants',
        'machine_id' => 'required|exists:machines,id',
        'type_id' => 'required|exists:types,id',
        'description' => 'nullable|string', // ✅ CHANGÉ : nullable au lieu de required
        'statut' => 'sometimes|in:bon,usure,defaillant,remplace',
        'quantite' => 'required|integer|min:1',
        'prix_unitaire' => 'nullable|numeric|min:0',
        'fournisseur' => 'nullable|string|max:100',
        'date_installation' => 'nullable|date',
        'derniere_inspection' => 'nullable|date',
        'prochaine_inspection' => 'nullable|date',
        'duree_vie_estimee' => 'nullable|integer|min:1',
        'notes' => 'nullable|string',
        'caracteristiques' => 'nullable',
    ];

    if ($request->hasFile('image')) {
        $rules['image'] = 'required|image|mimes:jpeg,png,jpg,gif|max:5120'; // 5MB max
    }

    // Messages d'erreur personnalisés
    $messages = [
        'nom.required' => 'Le nom du composant est obligatoire',
        'nom.max' => 'Le nom ne peut pas dépasser 100 caractères',
        'reference.required' => 'La référence est obligatoire',
        'reference.unique' => 'Cette référence existe déjà',
        'machine_id.required' => 'La machine est obligatoire',
        'machine_id.exists' => 'La machine sélectionnée n\'existe pas',
        'type_id.required' => 'Le type est obligatoire',
        'type_id.exists' => 'Le type sélectionné n\'existe pas',
        'quantite.required' => 'La quantité est obligatoire',
        'quantite.integer' => 'La quantité doit être un nombre entier',
        'quantite.min' => 'La quantité doit être au moins 1',
        'prix_unitaire.numeric' => 'Le prix doit être un nombre',
        'prix_unitaire.min' => 'Le prix ne peut pas être négatif',
        'image.image' => 'Le fichier doit être une image',
        'image.mimes' => 'L\'image doit être au format JPEG, PNG, JPG ou GIF',
        'image.max' => 'L\'image ne peut pas dépasser 5MB',
    ];

    try {
        $data = $request->validate($rules, $messages);

        // Traiter caracteristiques si présentes
        if (isset($data['caracteristiques'])) {
            $data['caracteristiques'] = $this->processCaracteristiques($data['caracteristiques']);
        }

        // Gestion de l'image
        if ($request->hasFile('image')) {
            $data['image_path'] = $this->uploadImage($request->file('image'));
        }

        $composant = Composant::create($data);
        $composant->load(['machine', 'type']);
        $this->addImageUrl($composant);

        return response()->json([
            'success' => true,
            'message' => 'Composant créé avec succès',
            'data' => $composant
        ], 201);

    } catch (\Illuminate\Validation\ValidationException $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreurs de validation',
            'errors' => $e->errors()
        ], 422);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la création du composant',
            'error' => $e->getMessage()
        ], 500);
    }
}

public function update(Request $request, $id)
{
    $composant = Composant::findOrFail($id);

    $rules = [
        'nom' => 'required|string|max:100',
        'reference' => 'required|string|max:50|unique:composants,reference,' . $id,
        'machine_id' => 'required|exists:machines,id',
        'type_id' => 'required|exists:types,id',
        'description' => 'nullable|string', // ✅ CHANGÉ : nullable au lieu de required
        'statut' => 'sometimes|in:bon,usure,defaillant,remplace',
        'quantite' => 'required|integer|min:1',
        'prix_unitaire' => 'nullable|numeric|min:0',
        'fournisseur' => 'nullable|string|max:100',
        'date_installation' => 'nullable|date',
        'derniere_inspection' => 'nullable|date',
        'prochaine_inspection' => 'nullable|date',
        'duree_vie_estimee' => 'nullable|integer|min:1',
        'notes' => 'nullable|string',
        'caracteristiques' => 'nullable',
    ];

    if ($request->hasFile('image')) {
        $rules['image'] = 'required|image|mimes:jpeg,png,jpg,gif|max:5120'; // 5MB max
    }

    // Messages d'erreur personnalisés
    $messages = [
        'nom.required' => 'Le nom du composant est obligatoire',
        'nom.max' => 'Le nom ne peut pas dépasser 100 caractères',
        'reference.required' => 'La référence est obligatoire',
        'reference.unique' => 'Cette référence existe déjà',
        'machine_id.required' => 'La machine est obligatoire',
        'machine_id.exists' => 'La machine sélectionnée n\'existe pas',
        'type_id.required' => 'Le type est obligatoire',
        'type_id.exists' => 'Le type sélectionné n\'existe pas',
        'quantite.required' => 'La quantité est obligatoire',
        'quantite.integer' => 'La quantité doit être un nombre entier',
        'quantite.min' => 'La quantité doit être au moins 1',
        'prix_unitaire.numeric' => 'Le prix doit être un nombre',
        'prix_unitaire.min' => 'Le prix ne peut pas être négatif',
        'image.image' => 'Le fichier doit être une image',
        'image.mimes' => 'L\'image doit être au format JPEG, PNG, JPG ou GIF',
        'image.max' => 'L\'image ne peut pas dépasser 5MB',
    ];

    try {
        $data = $request->validate($rules, $messages);

        // Traiter caracteristiques si présentes
        if (isset($data['caracteristiques'])) {
            $data['caracteristiques'] = $this->processCaracteristiques($data['caracteristiques']);
        }

        // Gestion de l'image
        if ($request->hasFile('image')) {
            // Supprimer l'ancienne image
            $this->deleteImageFile($composant->image_path);
            $data['image_path'] = $this->uploadImage($request->file('image'));
        }

        $ancienStatut = $composant->statut;
        $composant->update($data);

        // Notification si défaillant
        if ($request->statut === 'defaillant' && $ancienStatut !== 'defaillant') {
            Notification::notifierComposantDefaillant($composant);
        }

        $composant->load(['machine', 'type']);
        $this->addImageUrl($composant);

        return response()->json([
            'success' => true,
            'message' => 'Composant mis à jour avec succès',
            'data' => $composant
        ]);

    } catch (\Illuminate\Validation\ValidationException $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreurs de validation',
            'errors' => $e->errors()
        ], 422);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la mise à jour du composant',
            'error' => $e->getMessage()
        ], 500);
    }
}

// Méthode pour valider une image
private function validateImageFile($file)
{
    $allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
    $maxSize = 5 * 1024 * 1024; // 5MB

    if (!in_array($file->getMimeType(), $allowedTypes)) {
        throw new \Exception('Type de fichier non autorisé');
    }

    if ($file->getSize() > $maxSize) {
        throw new \Exception('Fichier trop volumineux (max 5MB)');
    }

    return true;
}

/**
 * Supprimer l'image d'un composant
 */
public function deleteImage($id)
{
    try {
        $composant = Composant::findOrFail($id);
        
        if ($composant->image) {
            // Supprimer le fichier physique
            $imagePath = public_path('storage/' . $composant->image);
            if (file_exists($imagePath)) {
                unlink($imagePath);
            }
            
            // Mettre à jour la base de données
            $composant->update(['image' => null]);
            
            return response()->json([
                'success' => true,
                'message' => 'Image supprimée avec succès'
            ]);
        }
        
        return response()->json([
            'success' => false,
            'message' => 'Aucune image à supprimer'
        ], 404);

    } catch (\Exception $e) {
        Log::error('Erreur lors de la suppression de l\'image du composant', [
            'composant_id' => $id,
            'error' => $e->getMessage()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la suppression de l\'image'
        ], 500);
    }
}


    public function destroy($id)
    {
        $composant = Composant::findOrFail($id);

        if ($composant->demandes()->count() > 0) {
            return response()->json([
                'message' => 'Impossible de supprimer ce composant car il a des demandes associées'
            ], 409);
        }

        $this->deleteImageFile($composant->image_path);
        $composant->delete();

        return response()->json([
            'message' => 'Composant supprimé avec succès'
        ]);
    }

    

    public function updateStatut(Request $request, $id)
    {
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

        if ($request->statut === 'defaillant' && $ancienStatut !== 'defaillant') {
            Notification::notifierComposantDefaillant($composant);
        }

        return response()->json([
            'message' => 'Statut mis à jour avec succès',
            'data' => $composant
        ]);
    }

    public function getDefaillants()
    {
        $composants = Composant::where('statut', 'defaillant')
                               ->with(['machine', 'type'])
                               ->orderBy('updated_at', 'desc')
                               ->get();

        $composants->transform(function ($composant) {
            $this->addImageUrl($composant);
            return $composant;
        });

        return response()->json([
            'message' => 'Composants défaillants récupérés avec succès',
            'data' => $composants
        ]);
    }

    public function getAInspecter()
    {
        $composants = Composant::where('prochaine_inspection', '<=', now()->addDays(7))
                               ->with(['machine', 'type'])
                               ->orderBy('prochaine_inspection')
                               ->get();

        $composants->transform(function ($composant) {
            $this->addImageUrl($composant);
            return $composant;
        });

        return response()->json([
            'message' => 'Composants à inspecter récupérés avec succès',
            'data' => $composants
        ]);
    }

    public function statistiques()
    {
        $stats = [
            'total' => Composant::count(),
            'bon' => Composant::where('statut', 'bon')->count(),
            'usure' => Composant::where('statut', 'usure')->count(),
            'defaillant' => Composant::where('statut', 'defaillant')->count(),
            'remplace' => Composant::where('statut', 'remplace')->count(),
            'avec_images' => Composant::whereNotNull('image_path')->count(),
        ];

        return response()->json([
            'message' => 'Statistiques récupérées avec succès',
            'data' => $stats
        ]);
    }

    // Méthodes privées utilitaires
    private function addImageUrl($composant)
    {
        if ($composant->image_path && Storage::disk('public')->exists($composant->image_path)) {
            $composant->image_url = url('storage/' . $composant->image_path);
            $composant->has_image = true;
        } else {
            $composant->image_url = null;
            $composant->has_image = false;
        }
    }

    private function processCaracteristiques($caracteristiques)
    {
        if (is_string($caracteristiques)) {
            $decoded = json_decode($caracteristiques, true);
            return $decoded ?: [];
        }
        return is_array($caracteristiques) ? $caracteristiques : [];
    }

    private function uploadImage($image)
    {
        if (!Storage::disk('public')->exists('composants')) {
            Storage::disk('public')->makeDirectory('composants');
        }

        $fileName = 'composant_' . time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
        $imagePath = $image->storeAs('composants', $fileName, 'public');
        
        Log::info('Image composant uploadée:', ['path' => $imagePath]);
        
        return $imagePath;
    }

    private function deleteImageFile($imagePath)
    {
        if ($imagePath && Storage::disk('public')->exists($imagePath)) {
            Storage::disk('public')->delete($imagePath);
            Log::info('Image composant supprimée:', ['path' => $imagePath]);
        }
    }
}