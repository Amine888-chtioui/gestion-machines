<?php
// app/Http/Controllers/Api/TypeController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Type;
use Illuminate\Http\Request;

class TypeController extends Controller
{
    public function index(Request $request)
    {
        $query = Type::query();

        // Filtres simples
        if ($request->has('actif')) {
            $query->where('actif', $request->boolean('actif'));
        }
        if ($request->search) {
            $query->where('nom', 'like', '%' . $request->search . '%');
        }

        // Tri et pagination
        $sortBy = $request->get('sort_by', 'nom');
        $sortOrder = $request->get('sort_order', 'asc');
        $perPage = $request->get('per_page', 15);

        $types = $query->withCount('composants')
                      ->orderBy($sortBy, $sortOrder)
                      ->paginate($perPage);

        return response()->json([
            'message' => 'Types récupérés avec succès',
            'data' => $types
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nom' => 'required|string|max:100|unique:types,nom',
            'description' => 'nullable|string',
            'couleur' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'actif' => 'boolean'
        ]);

        $type = Type::create($data);

        return response()->json([
            'message' => 'Type créé avec succès',
            'data' => $type
        ], 201);
    }

    public function show($id)
    {
        $type = Type::with(['composants.machine'])
                   ->withCount('composants')
                   ->findOrFail($id);

        return response()->json([
            'message' => 'Type récupéré avec succès',
            'data' => $type
        ]);
    }

    public function update(Request $request, $id)
    {
        $type = Type::findOrFail($id);

        $data = $request->validate([
            'nom' => 'sometimes|string|max:100|unique:types,nom,' . $id,
            'description' => 'nullable|string',
            'couleur' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'actif' => 'boolean'
        ]);

        $type->update($data);

        return response()->json([
            'message' => 'Type mis à jour avec succès',
            'data' => $type
        ]);
    }

    public function destroy($id)
    {
        $type = Type::findOrFail($id);

        if ($type->composants()->count() > 0) {
            return response()->json([
                'message' => 'Impossible de supprimer ce type car il est utilisé par des composants'
            ], 409);
        }

        $type->delete();

        return response()->json([
            'message' => 'Type supprimé avec succès'
        ]);
    }

    public function getActifs()
    {
        $types = Type::where('actif', true)
                    ->orderBy('nom')
                    ->get(['id', 'nom', 'couleur']);

        return response()->json([
            'message' => 'Types actifs récupérés avec succès',
            'data' => $types
        ]);
    }

    public function toggleActif($id)
    {
        $type = Type::findOrFail($id);
        $type->actif = !$type->actif;
        $type->save();

        return response()->json([
            'message' => 'Statut du type mis à jour avec succès',
            'data' => $type
        ]);
    }

    public function statistiques()
    {
        $stats = [
            'total' => Type::count(),
            'actifs' => Type::where('actif', true)->count(),
            'inactifs' => Type::where('actif', false)->count(),
            'avec_composants' => Type::has('composants')->count(),
            'sans_composants' => Type::doesntHave('composants')->count(),
        ];

        return response()->json([
            'message' => 'Statistiques des types récupérées avec succès',
            'data' => $stats
        ]);
    }
}