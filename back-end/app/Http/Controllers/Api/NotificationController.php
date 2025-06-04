<?php
// app/Http/Controllers/Api/NotificationController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Notification::where('user_id', $user->id);

        // Filtres simples
        if ($request->has('lu')) {
            $query->where('lu', $request->boolean('lu'));
        }
        if ($request->type) {
            $query->where('type', $request->type);
        }
        if ($request->boolean('recentes')) {
            $jours = $request->get('jours', 7);
            $query->where('created_at', '>=', now()->subDays($jours));
        }

        // Tri et pagination
        $query->orderBy('created_at', 'desc');
        $perPage = $request->get('per_page', 20);
        $notifications = $query->paginate($perPage);

        return response()->json([
            'message' => 'Notifications récupérées avec succès',
            'data' => $notifications
        ]);
    }

    public function show($id)
    {
        $user = request()->user();
        $notification = Notification::where('user_id', $user->id)->findOrFail($id);

        // Marquer comme lue automatiquement
        if (!$notification->lu) {
            $notification->update([
                'lu' => true,
                'lu_le' => now()
            ]);
        }

        return response()->json([
            'message' => 'Notification récupérée avec succès',
            'data' => $notification
        ]);
    }

    public function marquerCommeLue($id)
    {
        $user = request()->user();
        $notification = Notification::where('user_id', $user->id)->findOrFail($id);

        $notification->update([
            'lu' => true,
            'lu_le' => now()
        ]);

        return response()->json([
            'message' => 'Notification marquée comme lue',
            'data' => $notification
        ]);
    }

    public function marquerToutesCommeLues()
    {
        $user = request()->user();
        
        $count = Notification::where('user_id', $user->id)
                           ->where('lu', false)
                           ->update([
                               'lu' => true,
                               'lu_le' => now()
                           ]);

        return response()->json([
            'message' => "Toutes les notifications ont été marquées comme lues ($count)"
        ]);
    }

    public function destroy($id)
    {
        $user = request()->user();
        $notification = Notification::where('user_id', $user->id)->findOrFail($id);

        $notification->delete();

        return response()->json([
            'message' => 'Notification supprimée avec succès'
        ]);
    }

    public function supprimerLues()
    {
        $user = request()->user();
        
        $count = Notification::where('user_id', $user->id)
                           ->where('lu', true)
                           ->delete();

        return response()->json([
            'message' => "$count notifications lues supprimées avec succès"
        ]);
    }

    // Endpoint principal pour le polling (toutes les 5 secondes)
    public function polling()
    {
        $user = request()->user();
        
        // Récupérer les notifications non lues récentes
        $notifications = Notification::where('user_id', $user->id)
                                   ->where('lu', false)
                                   ->orderBy('created_at', 'desc')
                                   ->limit(10)
                                   ->get(['id', 'titre', 'message', 'type', 'created_at']);

        // Compter total non lues
        $count_non_lues = Notification::where('user_id', $user->id)
                                    ->where('lu', false)
                                    ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'notifications' => $notifications,
                'count_non_lues' => $count_non_lues,
                'last_check' => now()
            ]
        ]);
    }

    public function getNonLues()
    {
        $user = request()->user();
        
        $notifications = Notification::where('user_id', $user->id)
                                   ->where('lu', false)
                                   ->orderBy('created_at', 'desc')
                                   ->limit(10)
                                   ->get();

        return response()->json([
            'message' => 'Notifications non lues récupérées avec succès',
            'data' => $notifications,
            'count' => $notifications->count()
        ]);
    }

    public function getRecentes()
    {
        $user = request()->user();
        
        $notifications = Notification::where('user_id', $user->id)
                                   ->where('created_at', '>=', now()->subDays(7))
                                   ->orderBy('created_at', 'desc')
                                   ->limit(20)
                                   ->get();

        return response()->json([
            'message' => 'Notifications récentes récupérées avec succès',
            'data' => $notifications
        ]);
    }

    public function getCount()
    {
        $user = request()->user();
        
        $counts = [
            'total' => Notification::where('user_id', $user->id)->count(),
            'non_lues' => Notification::where('user_id', $user->id)->where('lu', false)->count(),
            'lues' => Notification::where('user_id', $user->id)->where('lu', true)->count(),
            'recentes' => Notification::where('user_id', $user->id)
                                    ->where('created_at', '>=', now()->subDays(7))
                                    ->count(),
        ];

        return response()->json([
            'message' => 'Compteurs récupérés avec succès',
            'data' => $counts
        ]);
    }

    // Routes admin uniquement
    public function creer(Request $request)
    {
        $user = $request->user();

        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Action non autorisée'], 403);
        }

        $data = $request->validate([
            'user_id' => 'required|exists:users,id',
            'titre' => 'required|string|max:150',
            'message' => 'required|string',
            'type' => 'sometimes|in:info,success,warning,error',
            'data' => 'nullable|array'
        ]);

        $notification = Notification::creerNotification(
            $data['user_id'],
            $data['titre'],
            $data['message'],
            $data['type'] ?? 'info',
            $data['data'] ?? null
        );

        return response()->json([
            'message' => 'Notification créée avec succès',
            'data' => $notification
        ], 201);
    }

    public function diffuser(Request $request)
    {
        $user = $request->user();

        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Action non autorisée'], 403);
        }

        $data = $request->validate([
            'titre' => 'required|string|max:150',
            'message' => 'required|string',
            'type' => 'sometimes|in:info,success,warning,error',
            'destinataires' => 'required|in:tous,admins,users',
            'data' => 'nullable|array'
        ]);

        $query = \App\Models\User::query();
        
        if ($data['destinataires'] === 'admins') {
            $query->where('role', 'admin');
        } elseif ($data['destinataires'] === 'users') {
            $query->where('role', 'user');
        }

        $utilisateurs = $query->where('actif', true)->get();
        $count = 0;

        foreach ($utilisateurs as $utilisateur) {
            Notification::creerNotification(
                $utilisateur->id,
                $data['titre'],
                $data['message'],
                $data['type'] ?? 'info',
                $data['data'] ?? null
            );
            $count++;
        }

        return response()->json([
            'message' => "Notification diffusée à $count utilisateur(s)"
        ]);
    }
}