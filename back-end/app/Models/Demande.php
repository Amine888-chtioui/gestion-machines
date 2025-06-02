<?php
// app/Models/Demande.php - Version complète mise à jour

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Demande extends Model
{
    use HasFactory;

    protected $fillable = [
        'numero_demande',
        'user_id',
        'machine_id',
        'composant_id',
        'type_demande',
        'priorite',
        'statut',
        'titre',
        'description',
        'justification',
        'quantite_demandee',
        'budget_estime',
        'date_souhaite',
        'traite_par',
        'commentaire_admin',
        'date_traitement',
    ];

    protected $casts = [
        'date_souhaite' => 'date',
        'date_traitement' => 'datetime',
        'budget_estime' => 'decimal:2',
        'quantite_demandee' => 'integer',
    ];

    protected $appends = [
        'statut_color',
        'priorite_color',
        'delai_traitement'
    ];

    // ===================================
    // RELATIONS
    // ===================================

    /**
     * Relation avec l'utilisateur qui a créé la demande
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relation avec la machine concernée
     */
    public function machine()
    {
        return $this->belongsTo(Machine::class);
    }

    /**
     * Relation avec le composant concerné (optionnel)
     */
    public function composant()
    {
        return $this->belongsTo(Composant::class);
    }

    /**
     * Relation avec l'admin qui a traité la demande
     */
    public function traitePar()
    {
        return $this->belongsTo(User::class, 'traite_par');
    }

    // ===================================
    // SCOPES
    // ===================================

    /**
     * Scope pour les demandes en attente
     */
    public function scopeEnAttente($query)
    {
        return $query->where('statut', 'en_attente');
    }

    /**
     * Scope pour les demandes urgentes (haute et critique)
     */
    public function scopeUrgentes($query)
    {
        return $query->whereIn('priorite', ['haute', 'critique']);
    }

    /**
     * Scope pour les demandes par statut
     */
    public function scopeParStatut($query, $statut)
    {
        return $query->where('statut', $statut);
    }

    /**
     * Scope pour les demandes par priorité
     */
    public function scopeParPriorite($query, $priorite)
    {
        return $query->where('priorite', $priorite);
    }

    /**
     * Scope pour les demandes par type
     */
    public function scopeParType($query, $type)
    {
        return $query->where('type_demande', $type);
    }

    /**
     * Scope pour les demandes récentes
     */
    public function scopeRecentes($query, $jours = 7)
    {
        return $query->where('created_at', '>=', now()->subDays($jours));
    }

    // ===================================
    // ACCESSEURS (GETTERS)
    // ===================================

    /**
     * Couleur du badge de statut
     */
    public function getStatutColorAttribute()
    {
        $colors = [
            'en_attente' => 'warning',
            'en_cours' => 'info',
            'acceptee' => 'success',
            'refusee' => 'danger',
            'terminee' => 'secondary',
        ];

        return $colors[$this->statut] ?? 'secondary';
    }

    /**
     * Couleur du badge de priorité
     */
    public function getPrioriteColorAttribute()
    {
        $colors = [
            'basse' => 'success',
            'normale' => 'info',
            'haute' => 'warning',
            'critique' => 'danger',
        ];

        return $colors[$this->priorite] ?? 'info';
    }

    /**
     * Délai de traitement en jours
     */
    public function getDelaiTraitementAttribute()
{
    // Vérifier que created_at n'est pas null
    if (!$this->created_at) {
        return null;
    }

    if ($this->date_traitement) {
        return $this->created_at->diffInDays($this->date_traitement);
    }

    return $this->created_at->diffInDays(now());
}

    /**
     * Statut formaté pour l'affichage
     */
    public function getStatutFormatteAttribute()
    {
        $statuts = [
            'en_attente' => 'En attente',
            'en_cours' => 'En cours',
            'acceptee' => 'Acceptée',
            'refusee' => 'Refusée',
            'terminee' => 'Terminée',
        ];

        return $statuts[$this->statut] ?? $this->statut;
    }

    /**
     * Priorité formatée pour l'affichage
     */
    public function getPrioriteFormateeAttribute()
    {
        $priorites = [
            'basse' => 'Basse',
            'normale' => 'Normale',
            'haute' => 'Haute',
            'critique' => 'Critique',
        ];

        return $priorites[$this->priorite] ?? $this->priorite;
    }

    /**
     * Type de demande formaté pour l'affichage
     */
    public function getTypeFormatteAttribute()
    {
        $types = [
            'maintenance' => 'Maintenance',
            'piece' => 'Pièce de rechange',
            'reparation' => 'Réparation',
            'inspection' => 'Inspection',
        ];

        return $types[$this->type_demande] ?? $this->type_demande;
    }

    /**
     * Vérifier si la demande est urgente
     */
    public function getIsUrgenteAttribute()
    {
        return in_array($this->priorite, ['haute', 'critique']);
    }

    /**
     * Vérifier si la demande peut être modifiée
     */
    public function getPeutEtreModifieeAttribute()
    {
        return $this->statut === 'en_attente';
    }

    /**
     * Vérifier si la demande peut être supprimée
     */
    public function getPeutEtreSupprimeeAttribute()
    {
        return $this->statut === 'en_attente';
    }

    // ===================================
    // MÉTHODES POUR ACTIONS ADMIN
    // ===================================

    /**
     * Accepter une demande
     */
    public function accepter($admin, $commentaire = null)
    {
        $this->update([
            'statut' => 'acceptee',
            'traite_par' => $admin->id,
            'date_traitement' => now(),
            'commentaire_admin' => $commentaire
        ]);

        // Créer la notification
        Notification::notifierDemandeAcceptee($this);

        return $this;
    }

    /**
     * Refuser une demande
     */
    public function refuser($admin, $commentaire)
    {
        $this->update([
            'statut' => 'refusee',
            'traite_par' => $admin->id,
            'date_traitement' => now(),
            'commentaire_admin' => $commentaire
        ]);

        // Créer la notification
        Notification::notifierDemandeRefusee($this, $commentaire);

        return $this;
    }

    /**
     * Marquer comme en cours
     */
    public function marquerEnCours($admin, $commentaire = null)
    {
        $this->update([
            'statut' => 'en_cours',
            'traite_par' => $admin->id,
            'date_traitement' => now(),
            'commentaire_admin' => $commentaire
        ]);

        // Créer la notification pour changement de statut
        Notification::notifierChangementStatut($this, $commentaire);

        return $this;
    }

    /**
     * Marquer comme terminée
     */
    public function marquerTerminee($admin, $commentaire = null)
    {
        $this->update([
            'statut' => 'terminee',
            'traite_par' => $admin->id,
            'date_traitement' => now(),
            'commentaire_admin' => $commentaire
        ]);

        // Créer la notification pour changement de statut
        Notification::notifierChangementStatut($this, $commentaire);

        return $this;
    }

    /**
     * Marquer comme traitée avec notification
     */
    public function marquerCommeTraitee($admin, $commentaire = null)
    {
        $this->update([
            'traite_par' => $admin->id,
            'date_traitement' => now(),
            'commentaire_admin' => $commentaire
        ]);

        // Créer la notification pour changement de statut
        Notification::notifierChangementStatut($this, $commentaire);

        return $this;
    }

    /**
     * Changer le statut avec notification
     */
    public function changerStatut($admin, $nouveauStatut, $commentaire = null)
    {
        $ancienStatut = $this->statut;
        
        $this->update([
            'statut' => $nouveauStatut,
            'traite_par' => $admin->id,
            'date_traitement' => now(),
            'commentaire_admin' => $commentaire
        ]);

        // Créer la notification si le statut a changé
        if ($ancienStatut !== $nouveauStatut) {
            Notification::notifierChangementStatut($this, $commentaire);
        }

        return $this;
    }

    // ===================================
    // MÉTHODES UTILITAIRES
    // ===================================

    /**
     * Générer un numéro de demande unique
     */
    public static function genererNumeroDemande()
    {
        $prefix = 'DEM-' . date('Ymd') . '-';
        $numero = 1;

        // Trouver le dernier numéro de la journée
        $derniere = self::where('numero_demande', 'like', $prefix . '%')
            ->orderBy('numero_demande', 'desc')
            ->first();

        if ($derniere) {
            $dernierNumero = intval(substr($derniere->numero_demande, strlen($prefix)));
            $numero = $dernierNumero + 1;
        }

        return $prefix . str_pad($numero, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Calculer la priorité numérique pour le tri
     */
    public function getPrioriteNumeriqueAttribute()
    {
        $priorites = [
            'basse' => 1,
            'normale' => 2,
            'haute' => 3,
            'critique' => 4,
        ];

        return $priorites[$this->priorite] ?? 2;
    }

    /**
     * Vérifier si un délai est dépassé
     */
    public function isDelaiDepasse()
    {
        if (!$this->date_souhaite) {
            return false;
        }

        return $this->date_souhaite->isPast() && $this->statut !== 'terminee';
    }

    /**
     * Obtenir le temps restant jusqu'à la date souhaitée
     */
    public function getTempsRestantAttribute()
{
    if (!$this->date_souhaite) {
        return null;
    }

    $diff = now()->diffInDays($this->date_souhaite, false);
    
    if ($diff < 0) {
        return 'Dépassé de ' . abs($diff) . ' jour(s)';
    } elseif ($diff === 0) {
        return 'Aujourd\'hui';
    } else {
        return 'Dans ' . $diff . ' jour(s)';
    }
}

    // ===================================
    // EVENTS ET OBSERVERS
    // ===================================

    /**
     * Boot du modèle
     */
   protected static function boot()
{
    parent::boot();

    // Générer automatiquement le numéro de demande à la création
    static::creating(function ($demande) {
        if (empty($demande->numero_demande)) {
            $demande->numero_demande = self::genererNumeroDemande();
        }

        // Définir les valeurs par défaut
        if (empty($demande->priorite)) {
            $demande->priorite = 'normale';
        }

        if (empty($demande->statut)) {
            $demande->statut = 'en_attente';
        }

        if (empty($demande->quantite_demandee)) {
            $demande->quantite_demandee = 1;
        }

        // S'assurer que created_at est défini
        if (!$demande->created_at) {
            $demande->created_at = now();
        }
    });

    // Après la création, notifier les admins
    static::created(function ($demande) {
        // Notifier les administrateurs d'une nouvelle demande
        try {
            Notification::notifierNouvelleDemandeAdmin($demande);
        } catch (\Exception $e) {
            \Log::error('Erreur lors de la notification de nouvelle demande:', [
                'demande_id' => $demande->id,
                'error' => $e->getMessage()
            ]);
        }
    });

    // Après mise à jour, vérifier les changements de statut
    static::updated(function ($demande) {
        // Si le statut a changé et qu'il y a un admin qui a traité
        if ($demande->wasChanged('statut') && $demande->traite_par) {
            // La notification est déjà gérée par les méthodes accepter/refuser/etc.
        }
    });
}

    // ===================================
    // MÉTHODES STATIQUES UTILES
    // ===================================

    /**
     * Obtenir les statistiques des demandes
     */
    public static function getStatistiques()
    {
        return [
            'total' => self::count(),
            'en_attente' => self::where('statut', 'en_attente')->count(),
            'en_cours' => self::where('statut', 'en_cours')->count(),
            'acceptees' => self::where('statut', 'acceptee')->count(),
            'refusees' => self::where('statut', 'refusee')->count(),
            'terminees' => self::where('statut', 'terminee')->count(),
            'urgentes' => self::whereIn('priorite', ['haute', 'critique'])->count(),
            'cette_semaine' => self::whereBetween('created_at', [
                now()->startOfWeek(),
                now()->endOfWeek()
            ])->count(),
            'ce_mois' => self::whereBetween('created_at', [
                now()->startOfMonth(),
                now()->endOfMonth()
            ])->count(),
        ];
    }

    /**
     * Obtenir les demandes par priorité
     */
    public static function getParPriorite()
    {
        return self::select('priorite', \DB::raw('COUNT(*) as total'))
            ->groupBy('priorite')
            ->get()
            ->pluck('total', 'priorite')
            ->toArray();
    }

    /**
     * Obtenir les demandes par type
     */
    public static function getParType()
    {
        return self::select('type_demande', \DB::raw('COUNT(*) as total'))
            ->groupBy('type_demande')
            ->get()
            ->pluck('total', 'type_demande')
            ->toArray();
    }

    /**
     * Obtenir les demandes par statut
     */
    public static function getParStatut()
    {
        return self::select('statut', \DB::raw('COUNT(*) as total'))
            ->groupBy('statut')
            ->get()
            ->pluck('total', 'statut')
            ->toArray();
    }

    // ===================================
    // MÉTHODES DE VALIDATION
    // ===================================

    /**
     * Règles de validation pour la création
     */
    public static function getValidationRules()
    {
        return [
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
        ];
    }

    /**
     * Règles de validation pour la mise à jour
     */
    public static function getUpdateValidationRules($id = null)
    {
        return [
            'titre' => 'sometimes|string|max:150',
            'description' => 'sometimes|string',
            'justification' => 'nullable|string',
            'quantite_demandee' => 'nullable|integer|min:1',
            'budget_estime' => 'nullable|numeric|min:0',
            'date_souhaite' => 'nullable|date|after:today',
            'priorite' => 'sometimes|in:basse,normale,haute,critique',
            'statut' => 'sometimes|in:en_attente,en_cours,acceptee,refusee,terminee',
            'commentaire_admin' => 'nullable|string'
        ];
    }

    // ===================================
    // CONVERSION EN ARRAY/JSON
    // ===================================

    /**
     * Attributs à masquer lors de la sérialisation
     */
    protected $hidden = [
        // Aucun attribut à masquer pour le moment
    ];

    /**
     * Attributs à inclure lors de la sérialisation
     */
    protected $with = [
        // Les relations ne sont pas automatiquement incluses
    ];

    /**
     * Formatter pour l'API
     */
    public function toApiArray()
    {
        return [
            'id' => $this->id,
            'numero_demande' => $this->numero_demande,
            'titre' => $this->titre,
            'description' => $this->description,
            'type_demande' => $this->type_demande,
            'type_formate' => $this->type_formate,
            'priorite' => $this->priorite,
            'priorite_formate' => $this->priorite_formate,
            'priorite_color' => $this->priorite_color,
            'statut' => $this->statut,
            'statut_formate' => $this->statut_formate,
            'statut_color' => $this->statut_color,
            'quantite_demandee' => $this->quantite_demandee,
            'budget_estime' => $this->budget_estime,
            'date_souhaite' => $this->date_souhaite?->format('Y-m-d'),
            'date_traitement' => $this->date_traitement?->format('Y-m-d H:i:s'),
            'delai_traitement' => $this->delai_traitement,
            'temps_restant' => $this->temps_restant,
            'is_urgente' => $this->is_urgente,
            'peut_etre_modifiee' => $this->peut_etre_modifiee,
            'peut_etre_supprimee' => $this->peut_etre_supprimee,
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at->format('Y-m-d H:i:s'),
            'machine' => $this->machine?->toArray(),
            'composant' => $this->composant?->toArray(),
            'user' => $this->user?->makeHidden(['password', 'remember_token'])->toArray(),
            'traite_par' => $this->traitePar?->makeHidden(['password', 'remember_token'])->toArray(),
        ];
    }
}