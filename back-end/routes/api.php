<?php
// routes/api.php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\TypeController;
use App\Http\Controllers\Api\MachineController;
use App\Http\Controllers\Api\ComposantController;
use App\Http\Controllers\Api\DemandeController;
use App\Http\Controllers\Api\NotificationController;

// Routes publiques
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/register', [AuthController::class, 'register']);

// Routes protégées
Route::middleware('auth:sanctum')->group(function () {
    
    // === AUTHENTIFICATION ===
    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::put('/profile', [AuthController::class, 'updateProfile']);
        Route::post('/refresh', [AuthController::class, 'refreshToken']);
    });

    // === DASHBOARD ===
    Route::prefix('dashboard')->group(function () {
        Route::get('/', [DashboardController::class, 'index']);
        Route::get('/statistiques-generales', [DashboardController::class, 'getStatistiquesGenerales']);
        Route::get('/statistiques-rapides', [DashboardController::class, 'statistiquesRapides']);
        Route::get('/alertes', [DashboardController::class, 'getAlertes']);
        Route::get('/activites', [DashboardController::class, 'getActivitesRecentes']);
        Route::get('/resume', [DashboardController::class, 'getResume']);
    });

    // === TYPES ===
    Route::prefix('types')->group(function () {
        Route::get('/', [TypeController::class, 'index']);
        Route::get('/actifs', [TypeController::class, 'getActifs']);
        Route::get('/statistiques', [TypeController::class, 'statistiques']);
        Route::get('/{id}', [TypeController::class, 'show']);
        
        // Routes admin
        Route::middleware('role:admin')->group(function () {
            Route::post('/', [TypeController::class, 'store']);
            Route::put('/{id}', [TypeController::class, 'update']);
            Route::delete('/{id}', [TypeController::class, 'destroy']);
            Route::patch('/{id}/toggle-actif', [TypeController::class, 'toggleActif']);
        });
    });

    // === MACHINES ===
    Route::prefix('machines')->group(function () {
        Route::get('/', [MachineController::class, 'index']);
        Route::get('/actives', [MachineController::class, 'getActives']);
        Route::get('/statistiques', [MachineController::class, 'statistiques']);
        Route::get('/{id}', [MachineController::class, 'show']);
        
        // Routes admin
        Route::middleware('role:admin')->group(function () {
            Route::post('/', [MachineController::class, 'store']);
            Route::put('/{id}', [MachineController::class, 'update']);
            Route::delete('/{id}', [MachineController::class, 'destroy']);
            Route::patch('/{id}/statut', [MachineController::class, 'updateStatut']);
            Route::delete('/{id}/image', [MachineController::class, 'deleteImage']);
        });
    });

    // === COMPOSANTS ===
    Route::prefix('composants')->group(function () {
        Route::get('/', [ComposantController::class, 'index']);
        Route::get('/statistiques', [ComposantController::class, 'statistiques']);
        Route::get('/defaillants', [ComposantController::class, 'getDefaillants']);
        Route::get('/a-inspecter', [ComposantController::class, 'getAInspecter']);
        Route::get('/{id}', [ComposantController::class, 'show']);
        
        // Routes admin
        Route::middleware('role:admin')->group(function () {
            Route::post('/', [ComposantController::class, 'store']);
            Route::put('/{id}', [ComposantController::class, 'update']);
            Route::delete('/{id}', [ComposantController::class, 'destroy']);
            Route::patch('/{id}/statut', [ComposantController::class, 'updateStatut']);
            Route::delete('/{id}/image', [ComposantController::class, 'deleteImage']);
        });
    });

    // === DEMANDES ===
    Route::prefix('demandes')->group(function () {
        Route::get('/', [DemandeController::class, 'index']);
        Route::post('/', [DemandeController::class, 'store']);
        Route::get('/statistiques', [DemandeController::class, 'statistiques']);
        Route::get('/mes-demandes-recentes', [DemandeController::class, 'mesDemandesRecentes']);
        Route::get('/{id}', [DemandeController::class, 'show']);
        Route::put('/{id}', [DemandeController::class, 'update']);
        Route::delete('/{id}', [DemandeController::class, 'destroy']);
        
        // Routes admin
        Route::middleware('role:admin')->group(function () {
            Route::get('/en-attente', [DemandeController::class, 'demandesEnAttente']);
            Route::get('/urgentes', [DemandeController::class, 'demandesUrgentes']);
            Route::patch('/{id}/accepter', [DemandeController::class, 'accepter']);
            Route::patch('/{id}/refuser', [DemandeController::class, 'refuser']);
            Route::patch('/{id}/statut', [DemandeController::class, 'changerStatut']);
        });
    });

    // === NOTIFICATIONS ===
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::get('/polling', [NotificationController::class, 'polling']); // Endpoint pour polling
        Route::get('/non-lues', [NotificationController::class, 'getNonLues']);
        Route::get('/recentes', [NotificationController::class, 'getRecentes']);
        Route::get('/count', [NotificationController::class, 'getCount']);
        Route::get('/{id}', [NotificationController::class, 'show']);
        Route::patch('/{id}/lue', [NotificationController::class, 'marquerCommeLue']);
        Route::patch('/marquer-toutes-lues', [NotificationController::class, 'marquerToutesCommeLues']);
        Route::delete('/{id}', [NotificationController::class, 'destroy']);
        Route::delete('/lues/supprimer', [NotificationController::class, 'supprimerLues']);
        
        // Routes admin
        Route::middleware('role:admin')->group(function () {
            Route::post('/', [NotificationController::class, 'creer']);
            Route::post('/diffuser', [NotificationController::class, 'diffuser']);
        });
    });

    // === UTILISATEURS (Admin) ===
    Route::prefix('users')->middleware('role:admin')->group(function () {
        Route::get('/', function (Request $request) {
            $users = \App\Models\User::when($request->role, function ($query, $role) {
                return $query->where('role', $role);
            })
            ->when($request->search, function ($query, $search) {
                return $query->where('name', 'like', '%' . $search . '%')
                            ->orWhere('email', 'like', '%' . $search . '%');
            })
            ->orderBy('name')
            ->paginate($request->get('per_page', 15));
            
            return response()->json([
                'message' => 'Utilisateurs récupérés avec succès',
                'data' => $users
            ]);
        });
        
        Route::patch('/{id}/toggle-active', function ($id) {
            $user = \App\Models\User::findOrFail($id);
            $user->actif = !$user->actif;
            $user->save();
            
            return response()->json([
                'message' => 'Statut utilisateur mis à jour',
                'data' => $user
            ]);
        });
    });
});

// Routes utilitaires
Route::get('/test', function () {
    return response()->json([
        'message' => 'API TELSOSPLICE TS3 - Fonctionnelle',
        'version' => '1.0.0',
        'timestamp' => now(),
    ]);
});

Route::get('/health', function () {
    try {
        DB::connection()->getPdo();
        
        return response()->json([
            'status' => 'healthy',
            'database' => 'connected',
            'timestamp' => now()
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'unhealthy',
            'database' => 'disconnected',
            'timestamp' => now()
        ], 500);
    }
});