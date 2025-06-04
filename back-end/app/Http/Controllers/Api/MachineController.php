<?php
// app/Http/Controllers/Api/MachineController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Machine;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class MachineController extends Controller
{
    public function index(Request $request)
    {
        $query = Machine::query();

        // Filtres simples
        if ($request->statut) $query->where('statut', $request->statut);
        if ($request->localisation) $query->where('localisation', 'like', '%' . $request->localisation . '%');
        if ($request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('nom', 'like', "%{$search}%")
                  ->orWhere('numero_serie', 'like', "%{$search}%");
            });
        }

        // Tri et pagination
        $sortBy = $request->get('sort_by', 'nom');
        $sortOrder = $request->get('sort_order', 'asc');
        $perPage = $request->get('per_page', 15);

        $machines = $query->withCount(['composants', 'demandes'])
                          ->orderBy($sortBy, $sortOrder)
                          ->paginate($perPage);

        // Ajouter URLs images
        $machines->getCollection()->transform(function ($machine) {
            $this->addImageUrl($machine);
            return $machine;
        });

        return response()->json([
            'message' => 'Machines récupérées avec succès',
            'data' => $machines
        ]);
    }

    public function show($id)
    {
        $machine = Machine::with([
            'composants.type',
            'demandes' => fn($q) => $q->latest()->take(10),
            'demandes.user'
        ])->findOrFail($id);

        $this->addImageUrl($machine);
        $this->addStatistiques($machine);

        return response()->json([
            'message' => 'Machine récupérée avec succès',
            'data' => $machine
        ]);
    }

    public function store(Request $request)
    {
        $rules = [
            'nom' => 'required|string|max:100',
            'numero_serie' => 'required|string|max:50|unique:machines',
            'modele' => 'nullable|string|max:50',
            'description' => 'nullable|string',
            'localisation' => 'nullable|string|max:100',
            'statut' => 'nullable|in:actif,inactif,maintenance',
            'date_installation' => 'nullable|date',
            'derniere_maintenance' => 'nullable|date',
            'specifications_techniques' => 'nullable',
        ];

        if ($request->hasFile('image')) {
            $rules['image'] = 'required|image|mimes:jpeg,png,jpg,gif|max:2048';
        }

        $data = $request->validate($rules);
        
        // Traiter specifications_techniques
        $data['specifications_techniques'] = $this->processSpecifications($request->specifications_techniques);

        // Gestion image
        if ($request->hasFile('image')) {
            $data['image_path'] = $this->uploadImage($request->file('image'));
        }

        $machine = Machine::create($data);
        $this->addImageUrl($machine);

        return response()->json([
            'message' => 'Machine créée avec succès',
            'data' => $machine
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $machine = Machine::findOrFail($id);

        $rules = [
            'nom' => 'sometimes|string|max:100',
            'numero_serie' => 'sometimes|string|max:50|unique:machines,numero_serie,' . $id,
            'modele' => 'sometimes|string|max:50',
            'description' => 'nullable|string',
            'localisation' => 'nullable|string|max:100',
            'statut' => 'sometimes|in:actif,inactif,maintenance',
            'date_installation' => 'nullable|date',
            'derniere_maintenance' => 'nullable|date',
            'specifications_techniques' => 'nullable',
        ];

        if ($request->hasFile('image')) {
            $rules['image'] = 'required|image|mimes:jpeg,png,jpg,gif|max:2048';
        }

        $data = $request->validate($rules);

        // Traiter specifications_techniques
        if (isset($data['specifications_techniques'])) {
            $data['specifications_techniques'] = $this->processSpecifications($data['specifications_techniques']);
        }

        // Gestion image
        if ($request->hasFile('image')) {
            $this->deleteImageFile($machine->image_path);
            $data['image_path'] = $this->uploadImage($request->file('image'));
        }

        $machine->update($data);
        $this->addImageUrl($machine);

        return response()->json([
            'message' => 'Machine mise à jour avec succès',
            'data' => $machine
        ]);
    }

    public function destroy($id)
    {
        $machine = Machine::findOrFail($id);

        if ($machine->composants()->count() > 0) {
            return response()->json([
                'message' => 'Impossible de supprimer cette machine car elle contient des composants'
            ], 409);
        }

        $this->deleteImageFile($machine->image_path);
        $machine->delete();

        return response()->json([
            'message' => 'Machine supprimée avec succès'
        ]);
    }

    public function deleteImage($id)
    {
        $machine = Machine::findOrFail($id);
        
        if ($machine->image_path) {
            $this->deleteImageFile($machine->image_path);
            $machine->update(['image_path' => null]);
            
            return response()->json([
                'message' => 'Image supprimée avec succès'
            ]);
        }
        
        return response()->json([
            'message' => 'Aucune image à supprimer'
        ], 404);
    }

    public function getActives()
    {
        $machines = Machine::where('statut', 'actif')
                          ->orderBy('nom')
                          ->get(['id', 'nom', 'numero_serie', 'localisation', 'image_path']);

        $machines->transform(function ($machine) {
            $this->addImageUrl($machine);
            return $machine;
        });

        return response()->json([
            'message' => 'Machines actives récupérées avec succès',
            'data' => $machines
        ]);
    }

    public function updateStatut(Request $request, $id)
    {
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
            'message' => 'Statut mis à jour avec succès',
            'data' => $machine
        ]);
    }

    public function statistiques()
    {
        $stats = [
            'total' => Machine::count(),
            'actives' => Machine::where('statut', 'actif')->count(),
            'inactives' => Machine::where('statut', 'inactif')->count(),
            'en_maintenance' => Machine::where('statut', 'maintenance')->count(),
            'avec_images' => Machine::whereNotNull('image_path')->count(),
        ];

        return response()->json([
            'message' => 'Statistiques récupérées avec succès',
            'data' => $stats
        ]);
    }

    // Méthodes privées utilitaires
    private function addImageUrl($machine)
    {
        if ($machine->image_path && Storage::disk('public')->exists($machine->image_path)) {
            $machine->image_url = url('storage/' . $machine->image_path);
            $machine->has_image = true;
        } else {
            $machine->image_url = null;
            $machine->has_image = false;
        }
    }

    private function addStatistiques($machine)
    {
        $machine->statistiques = [
            'composants_total' => $machine->composants->count(),
            'composants_bon' => $machine->composants->where('statut', 'bon')->count(),
            'composants_defaillant' => $machine->composants->where('statut', 'defaillant')->count(),
            'demandes_total' => $machine->demandes->count(),
        ];
    }

    private function processSpecifications($specs)
    {
        if (is_string($specs)) {
            $decoded = json_decode($specs, true);
            return $decoded ?: [];
        }
        return is_array($specs) ? $specs : [];
    }

    private function uploadImage($image)
    {
        if (!Storage::disk('public')->exists('machines')) {
            Storage::disk('public')->makeDirectory('machines');
        }

        $fileName = 'machine_' . time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
        $imagePath = $image->storeAs('machines', $fileName, 'public');
        
        Log::info('Image uploadée:', ['path' => $imagePath]);
        
        return $imagePath;
    }

    private function deleteImageFile($imagePath)
    {
        if ($imagePath && Storage::disk('public')->exists($imagePath)) {
            Storage::disk('public')->delete($imagePath);
            Log::info('Image supprimée:', ['path' => $imagePath]);
        }
    }
}