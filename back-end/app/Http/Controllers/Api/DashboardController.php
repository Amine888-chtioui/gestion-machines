<?php
// app/Http/Controllers/Api/DashboardController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Machine;
use App\Models\Composant;
use App\Models\Demande;
use App\Models\User;
use App\Models\Notification;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        return $user->isAdmin() 
            ? $this->dashboardAdmin() 
            : $this->dashboardUser($user);
    }

    private function dashboardAdmin()
    {
        // Statistiques principales
        $statistiques = [
            'machines' => [
                'total' => Machine::count(),
                'actives' => Machine::where('statut', 'actif')->count(),
                'en_maintenance' => Machine::where('statut', 'maintenance')->count(),
                'inactives' => Machine::where('statut', 'inactif')->count(),
            ],
            'composants' => [
                'total' => Composant::count(),
                'bon' => Composant::where('statut', 'bon')->count(),
                'defaillant' => Composant::where('statut', 'defaillant')->count(),
                'a_inspecter' => Composant::where('prochaine_inspection', '<=', now()->addDays(7))->count(),
            ],
            'demandes' => [
                'total' => Demande::count(),
                'en_attente' => Demande::where('statut', 'en_attente')->count(),
                'urgentes' => Demande::whereIn('priorite', ['haute', 'critique'])->count(),
                'ce_mois' => Demande::whereMonth('created_at', now()->month)->count(),
            ],
            'utilisateurs' => [
                'total' => User::count(),
                'actifs' => User::where('actif', true)->count(),
            ]
        ];

        // Alertes importantes
        $alertes = [
            'composants_defaillants' => Composant::where('statut', 'defaillant')
                                                ->with(['machine', 'type'])
                                                ->take(5)->get(),
            'demandes_urgentes' => Demande::whereIn('priorite', ['haute', 'critique'])
                                         ->where('statut', 'en_attente')
                                         ->with(['user', 'machine'])
                                         ->take(5)->get(),
            'machines_maintenance' => Machine::where('statut', 'maintenance')
                                            ->take(5)->get(),
        ];

        // Activités récentes
        $activites = [
            'demandes_recentes' => Demande::with(['user', 'machine'])
                                         ->orderBy('created_at', 'desc')
                                         ->take(10)->get(),
            'notifications_recentes' => Notification::orderBy('created_at', 'desc')
                                                  ->take(5)->get(),
        ];

        return response()->json([
            'message' => 'Dashboard admin récupéré avec succès',
            'data' => [
                'statistiques' => $statistiques,
                'alertes' => $alertes,
                'activites' => $activites,
                'resume' => $this->genererResumeAdmin($statistiques, $alertes),
            ]
        ]);
    }

    private function dashboardUser($user)
    {
        // Mes statistiques
        $mes_statistiques = [
            'mes_demandes' => [
                'total' => $user->demandes()->count(),
                'en_attente' => $user->demandes()->where('statut', 'en_attente')->count(),
                'acceptees' => $user->demandes()->where('statut', 'acceptee')->count(),
                'ce_mois' => $user->demandes()->whereMonth('created_at', now()->month)->count(),
            ]
        ];

        // Mes demandes récentes
        $mes_demandes = $user->demandes()
                           ->with(['machine', 'composant'])
                           ->orderBy('created_at', 'desc')
                           ->take(10)
                           ->get();

        // Infos générales (limitées)
        $infos_generales = [
            'machines_actives' => Machine::where('statut', 'actif')->count(),
            'composants_total' => Composant::count(),
        ];

        return response()->json([
            'message' => 'Dashboard utilisateur récupéré avec succès',
            'data' => [
                'mes_statistiques' => $mes_statistiques,
                'mes_demandes' => $mes_demandes,
                'infos_generales' => $infos_generales,
                'resume' => $this->genererResumeUser($user, $mes_statistiques),
            ]
        ]);
    }

    public function getStatistiquesGenerales()
    {
        $user = request()->user();

        if ($user->isAdmin()) {
            $stats = [
                'machines' => [
                    'total' => Machine::count(),
                    'actives' => Machine::where('statut', 'actif')->count(),
                    'en_maintenance' => Machine::where('statut', 'maintenance')->count(),
                ],
                'composants' => [
                    'total' => Composant::count(),
                    'bon' => Composant::where('statut', 'bon')->count(),
                    'defaillant' => Composant::where('statut', 'defaillant')->count(),
                ],
                'demandes' => [
                    'total' => Demande::count(),
                    'en_attente' => Demande::where('statut', 'en_attente')->count(),
                    'urgentes' => Demande::whereIn('priorite', ['haute', 'critique'])->count(),
                ],
            ];
        } else {
            $stats = [
                'mes_demandes' => [
                    'total' => $user->demandes()->count(),
                    'en_attente' => $user->demandes()->where('statut', 'en_attente')->count(),
                ],
                'machines_actives' => Machine::where('statut', 'actif')->count(),
            ];
        }

        return response()->json([
            'message' => 'Statistiques récupérées avec succès',
            'data' => $stats
        ]);
    }

    public function getAlertes()
    {
        $user = request()->user();

        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Action non autorisée'], 403);
        }

        $alertes = [
            'composants_defaillants' => Composant::where('statut', 'defaillant')->count(),
            'machines_maintenance' => Machine::where('statut', 'maintenance')->count(),
            'demandes_urgentes' => Demande::whereIn('priorite', ['haute', 'critique'])
                                         ->where('statut', 'en_attente')->count(),
            'composants_a_inspecter' => Composant::where('prochaine_inspection', '<=', now()->addDays(7))->count(),
        ];

        return response()->json([
            'message' => 'Alertes récupérées avec succès',
            'data' => $alertes
        ]);
    }

    public function getActivitesRecentes()
    {
        $user = request()->user();

        if ($user->isAdmin()) {
            $activites = [
                'demandes_recentes' => Demande::with(['user', 'machine'])
                                             ->orderBy('created_at', 'desc')
                                             ->take(10)->get(),
                'machines_modifiees' => Machine::orderBy('updated_at', 'desc')
                                              ->take(5)
                                              ->get(['id', 'nom', 'statut', 'updated_at']),
            ];
        } else {
            $activites = [
                'mes_demandes_recentes' => $user->demandes()
                                               ->with(['machine'])
                                               ->orderBy('created_at', 'desc')
                                               ->take(5)->get(),
            ];
        }

        return response()->json([
            'message' => 'Activités récupérées avec succès',
            'data' => $activites
        ]);
    }

    public function getResume()
    {
        $user = request()->user();
        $resume = [];

        if ($user->isAdmin()) {
            $enAttente = Demande::where('statut', 'en_attente')->count();
            $defaillants = Composant::where('statut', 'defaillant')->count();
            $maintenance = Machine::where('statut', 'maintenance')->count();
            
            if ($enAttente > 0) {
                $resume[] = [
                    'type' => 'warning',
                    'message' => "$enAttente demande(s) en attente",
                    'action' => 'Consulter les demandes'
                ];
            }
            
            if ($defaillants > 0) {
                $resume[] = [
                    'type' => 'error',
                    'message' => "$defaillants composant(s) défaillant(s)",
                    'action' => 'Vérifier les composants'
                ];
            }
        } else {
            $mesEnAttente = $user->demandes()->where('statut', 'en_attente')->count();
            
            if ($mesEnAttente > 0) {
                $resume[] = [
                    'type' => 'info',
                    'message' => "Vous avez $mesEnAttente demande(s) en attente",
                    'action' => 'Suivre vos demandes'
                ];
            }
        }

        if (empty($resume)) {
            $resume[] = [
                'type' => 'success',
                'message' => 'Tout fonctionne normalement !',
                'action' => null
            ];
        }

        return response()->json([
            'message' => 'Résumé récupéré avec succès',
            'data' => $resume
        ]);
    }

    public function statistiquesRapides()
    {
        $user = request()->user();

        if ($user->isAdmin()) {
            $stats = [
                'machines_actives' => Machine::where('statut', 'actif')->count(),
                'demandes_en_attente' => Demande::where('statut', 'en_attente')->count(),
                'composants_defaillants' => Composant::where('statut', 'defaillant')->count(),
                'notifications_non_lues' => Notification::where('lu', false)->count(),
            ];
        } else {
            $stats = [
                'mes_demandes_total' => $user->demandes()->count(),
                'mes_demandes_en_attente' => $user->demandes()->where('statut', 'en_attente')->count(),
                'mes_notifications_non_lues' => $user->notifications()->where('lu', false)->count(),
            ];
        }

        return response()->json([
            'message' => 'Statistiques rapides récupérées',
            'data' => $stats
        ]);
    }

    // Méthodes privées pour générer les résumés
    private function genererResumeAdmin($statistiques, $alertes)
    {
        $resume = [];

        if ($statistiques['demandes']['en_attente'] > 0) {
            $resume[] = [
                'type' => 'warning',
                'message' => "{$statistiques['demandes']['en_attente']} demande(s) en attente",
                'action' => 'Consulter les demandes'
            ];
        }

        if ($alertes['composants_defaillants']->count() > 0) {
            $resume[] = [
                'type' => 'error',
                'message' => "{$alertes['composants_defaillants']->count()} composant(s) défaillant(s)",
                'action' => 'Voir les composants'
            ];
        }

        if ($alertes['machines_maintenance']->count() > 0) {
            $resume[] = [
                'type' => 'warning',
                'message' => "{$alertes['machines_maintenance']->count()} machine(s) en maintenance",
                'action' => 'Suivre les maintenances'
            ];
        }

        if (empty($resume)) {
            $resume[] = [
                'type' => 'success',
                'message' => 'Tous les systèmes fonctionnent normalement',
                'action' => null
            ];
        }

        return $resume;
    }

    private function genererResumeUser($user, $mes_statistiques)
    {
        $resume = [];

        if ($mes_statistiques['mes_demandes']['en_attente'] > 0) {
            $resume[] = [
                'type' => 'info',
                'message' => "Vous avez {$mes_statistiques['mes_demandes']['en_attente']} demande(s) en attente",
                'action' => 'Suivre mes demandes'
            ];
        }

        if ($mes_statistiques['mes_demandes']['total'] === 0) {
            $resume[] = [
                'type' => 'info',
                'message' => 'Vous n\'avez pas encore soumis de demandes',
                'action' => 'Créer une nouvelle demande'
            ];
        }

        return $resume;
    }
}