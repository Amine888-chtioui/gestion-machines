<?php
// app/Http/Controllers/Api/DemandeController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Demande;
use App\Models\Notification;
use Illuminate\Http\Request;

class DemandeController extends Controller
{
    public function index(Request $request)
    {
        $query = Demande::with(['user', 'machine', 'composant', 'traitePar']);

        // Filtrage par rôle
        $user = $request->user();
        if (!$user->isAdmin()) {
            $query->where('user_id', $user->id);
        }

        // Filtres simples
        if ($request->statut) $query->where('statut', $request->statut);
        if ($request->type_demande) $query->where('type_demande', $request->type_demande);
        if ($request->priorite) $query->where('priorite', $request->priorite);
        if ($request->machine_id) $query->where('machine_id', $request->machine_id);
        if ($request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('numero_demande', 'like', "%{$search}%")
                  ->orWhere('titre', 'like', "%{$search}%");
            });
        }

        // Filtres de date
        if ($request->date_debut) $query->whereDate('created_at', '>=', $request->date_debut);
        if ($request->date_fin) $query->whereDate('created_at', '<=', $request->date_fin);

        // Tri et pagination
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $perPage = $request->get('per_page', 15);

        $demandes = $query->orderBy($sortBy, $sortOrder)->paginate($perPage);

        return response()->json([
            'message' => 'Demandes récupérées avec succès',
            'data' => $demandes
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'machine_id' => 'required|exists:machines,id',
            'composant_id' => 'nullable|exists:composants,id',
            'type_demande' => 'required|in:maintenance,piece,reparation,inspection',
            'priorite' => 'sometimes|in:basse,normale,haute,critique',
            'titre' => 'required|string|max:150',
            'description' => 'required|string',
            'justification' => 'nullable|string',
            'quantite_demandee' => 'nullable|integer|min:1',
            'budget_estime' => 'nullable|numeric|min:0',
            'date_souhaite' => 'nullable|date|after:today'
        ]);

        $data['user_id'] = $request->user()->id;
        $demande = Demande::create($data);
        $demande->load(['user', 'machine', 'composant']);

        // Notifier les admins
        Notification::notifierNouvelleDemandeAdmin($demande);

        return response()->json([
            'message' => 'Demande créée avec succès',
            'data' => $demande
        ], 201);
    }

    public function show($id)
    {
        $user = request()->user();
        $query = Demande::with(['user', 'machine', 'composant', 'traitePar']);
        
        if (!$user->isAdmin()) {
            $query->where('user_id', $user->id);
        }

        $demande = $query->findOrFail($id);

        return response()->json([
            'message' => 'Demande récupérée avec succès',
            'data' => $demande
        ]);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        $query = Demande::query();

        if (!$user->isAdmin()) {
            $query->where('user_id', $user->id);
        }

        $demande = $query->findOrFail($id);

        // Utilisateur ne peut modifier que ses demandes en attente
        if (!$user->isAdmin() && $demande->statut !== 'en_attente') {
            return response()->json([
                'message' => 'Vous ne pouvez pas modifier cette demande'
            ], 403);
        }

        $rules = [
            'titre' => 'sometimes|string|max:150',
            'description' => 'sometimes|string',
            'justification' => 'nullable|string',
            'quantite_demandee' => 'nullable|integer|min:1',
            'budget_estime' => 'nullable|numeric|min:0',
            'date_souhaite' => 'nullable|date|after:today'
        ];

        // Règles supplémentaires pour admin
        if ($user->isAdmin()) {
            $rules = array_merge($rules, [
                'priorite' => 'sometimes|in:basse,normale,haute,critique',
                'statut' => 'sometimes|in:en_attente,en_cours,acceptee,refusee,terminee',
                'commentaire_admin' => 'nullable|string'
            ]);
        }

        $data = $request->validate($rules);
        $ancienStatut = $demande->statut;
        
        $demande->update($data);

        // Notification si changement de statut par admin
        if ($user->isAdmin() && $request->has('statut') && $request->statut !== $ancienStatut) {
            $demande->marquerCommeTraitee($user, $request->commentaire_admin);
            Notification::notifierStatutDemande($demande);
        }

        $demande->load(['user', 'machine', 'composant', 'traitePar']);

        return response()->json([
            'message' => 'Demande mise à jour avec succès',
            'data' => $demande
        ]);
    }

    public function destroy($id)
    {
        $user = request()->user();
        $query = Demande::query();

        if (!$user->isAdmin()) {
            $query->where('user_id', $user->id);
        }

        $demande = $query->findOrFail($id);

        if (!$user->isAdmin() && $demande->statut !== 'en_attente') {
            return response()->json([
                'message' => 'Vous ne pouvez pas supprimer cette demande'
            ], 403);
        }

        $demande->delete();

        return response()->json([
            'message' => 'Demande supprimée avec succès'
        ]);
    }

    public function accepter(Request $request, $id)
    {
        $user = $request->user();

        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Action non autorisée'], 403);
        }

        $request->validate([
            'commentaire_admin' => 'nullable|string|max:1000'
        ]);

        $demande = Demande::findOrFail($id);

        if ($demande->statut !== 'en_attente') {
            return response()->json([
                'message' => 'Cette demande ne peut plus être acceptée'
            ], 400);
        }

        $demande->accepter($user, $request->commentaire_admin);
        $demande->load(['user', 'machine', 'composant', 'traitePar']);

        return response()->json([
            'message' => 'Demande acceptée avec succès',
            'data' => $demande
        ]);
    }

    public function refuser(Request $request, $id)
    {
        $user = $request->user();

        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Action non autorisée'], 403);
        }

        $request->validate([
            'commentaire_admin' => 'required|string|max:1000'
        ]);

        $demande = Demande::findOrFail($id);

        if ($demande->statut !== 'en_attente') {
            return response()->json([
                'message' => 'Cette demande ne peut plus être refusée'
            ], 400);
        }

        $demande->refuser($user, $request->commentaire_admin);
        $demande->load(['user', 'machine', 'composant', 'traitePar']);

        return response()->json([
            'message' => 'Demande refusée avec succès',
            'data' => $demande
        ]);
    }

    public function changerStatut(Request $request, $id)
    {
        $user = $request->user();

        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Action non autorisée'], 403);
        }

        $request->validate([
            'statut' => 'required|in:en_attente,en_cours,acceptee,refusee,terminee',
            'commentaire_admin' => 'nullable|string'
        ]);

        $demande = Demande::findOrFail($id);
        $ancienStatut = $demande->statut;

        $demande->update([
            'statut' => $request->statut,
            'traite_par' => $user->id,
            'date_traitement' => now(),
            'commentaire_admin' => $request->commentaire_admin
        ]);

        if ($request->statut !== $ancienStatut) {
            Notification::notifierStatutDemande($demande);
        }

        $demande->load(['user', 'machine', 'composant', 'traitePar']);

        return response()->json([
            'message' => 'Statut mis à jour avec succès',
            'data' => $demande
        ]);
    }

    public function demandesEnAttente()
    {
        $user = request()->user();

        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Action non autorisée'], 403);
        }

        $demandes = Demande::where('statut', 'en_attente')
                          ->with(['user', 'machine', 'composant'])
                          ->orderBy('priorite', 'desc')
                          ->orderBy('created_at', 'asc')
                          ->get();

        return response()->json([
            'message' => 'Demandes en attente récupérées avec succès',
            'data' => $demandes
        ]);
    }

    public function demandesUrgentes()
    {
        $user = request()->user();

        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Action non autorisée'], 403);
        }

        $demandes = Demande::whereIn('priorite', ['haute', 'critique'])
                          ->with(['user', 'machine', 'composant'])
                          ->orderBy('priorite', 'desc')
                          ->orderBy('created_at', 'asc')
                          ->get();

        return response()->json([
            'message' => 'Demandes urgentes récupérées avec succès',
            'data' => $demandes
        ]);
    }

    public function mesDemandesRecentes()
    {
        $user = request()->user();
        
        $demandes = Demande::where('user_id', $user->id)
                          ->with(['machine', 'composant'])
                          ->orderBy('created_at', 'desc')
                          ->take(10)
                          ->get();

        return response()->json([
            'message' => 'Demandes récentes récupérées avec succès',
            'data' => $demandes
        ]);
    }

    public function statistiques()
    {
        $user = request()->user();
        $query = Demande::query();

        if (!$user->isAdmin()) {
            $query->where('user_id', $user->id);
        }

        $stats = [
            'total' => $query->count(),
            'en_attente' => (clone $query)->where('statut', 'en_attente')->count(),
            'acceptees' => (clone $query)->where('statut', 'acceptee')->count(),
            'refusees' => (clone $query)->where('statut', 'refusee')->count(),
            'urgentes' => (clone $query)->whereIn('priorite', ['haute', 'critique'])->count(),
        ];

        return response()->json([
            'message' => 'Statistiques récupérées avec succès',
            'data' => $stats
        ]);
    }       
}