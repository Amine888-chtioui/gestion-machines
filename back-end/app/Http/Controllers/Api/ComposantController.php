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
            'description' => 'nullable|string',
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
            $rules['image'] = 'required|image|mimes:jpeg,png,jpg,gif|max:2048';
        }

        $data = $request->validate($rules);

        // Traiter caracteristiques
        if (isset($data['caracteristiques'])) {
            $data['caracteristiques'] = $this->processCaracteristiques($data['caracteristiques']);
        }

        // Gestion image
        if ($request->hasFile('image')) {
            $data['image_path'] = $this->uploadImage($request->file('image'));
        }

        $composant = Composant::create($data);
        $composant->load(['machine', 'type']);
        $this->addImageUrl($composant);

        return response()->json([
            'message' => 'Composant créé avec succès',
            'data' => $composant
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $composant = Composant::findOrFail($id);

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
            'caracteristiques' => 'nullable',
        ];

        if ($request->hasFile('image')) {
            $rules['image'] = 'required|image|mimes:jpeg,png,jpg,gif|max:2048';
        }

        $data = $request->validate($rules);

        // Traiter caracteristiques
        if (isset($data['caracteristiques'])) {
            $data['caracteristiques'] = $this->processCaracteristiques($data['caracteristiques']);
        }

        // Gestion image
        if ($request->hasFile('image')) {
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
            'message' => 'Composant mis à jour avec succès',
            'data' => $composant
        ]);
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

    public function deleteImage($id)
    {
        $composant = Composant::findOrFail($id);
        
        if ($composant->image_path) {
            $this->deleteImageFile($composant->image_path);
            $composant->update(['image_path' => null]);
            
            return response()->json([
                'message' => 'Image supprimée avec succès'
            ]);
        }
        
        return response()->json([
            'message' => 'Aucune image à supprimer'
        ], 404);
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