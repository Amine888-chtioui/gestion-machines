<?php
// app/Models/Notification.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'titre',
        'message',
        'type',
        'data',
        'lu',
        'lu_le'
    ];

    protected $casts = [
        'data' => 'array',
        'lu' => 'boolean',
        'lu_le' => 'datetime',
    ];

    // ========================================
    // RELATIONS
    // ========================================

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // ========================================
    // SCOPES (pour requêtes fréquentes)
    // ========================================

    public function scopeNonLues($query)
    {
        return $query->where('lu', false);
    }

    public function scopeLues($query)
    {
        return $query->where('lu', true);
    }

    public function scopeRecentes($query, $jours = 7)
    {
        return $query->where('created_at', '>=', now()->subDays($jours));
    }

    public function scopeParType($query, $type)
    {
        return $query->where('type', $type);
    }

    public function scopeParUtilisateur($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    // ========================================
    // MÉTHODES STATIQUES (Création de notifications)
    // ========================================

    /**
     * Créer une notification simple
     */
    public static function creer($userId, $titre, $message, $type = 'info', $data = null)
    {
        return self::create([
            'user_id' => $userId,
            'titre' => $titre,
            'message' => $message,
            'type' => $type,
            'data' => $data,
        ]);
    }

    /**
     * Notifier tous les admins
     */
    public static function notifierAdmins($titre, $message, $type = 'info', $data = null)
    {
        $admins = User::where('role', 'admin')->where('actif', true)->get();
        
        foreach ($admins as $admin) {
            self::creer($admin->id, $titre, $message, $type, $data);
        }
        
        return $admins->count();
    }

    /**
     * Notifier tous les utilisateurs
     */
    public static function notifierTous($titre, $message, $type = 'info', $data = null)
    {
        $users = User::where('actif', true)->get();
        
        foreach ($users as $user) {
            self::creer($user->id, $titre, $message, $type, $data);
        }
        
        return $users->count();
    }

    /**
     * Nouvelle demande - Notifier les admins
     */
    public static function notifierNouvelleDemandeAdmin($demande)
    {
        $titre = 'Nouvelle demande';
        $message = "Nouvelle demande #{$demande->numero_demande} de {$demande->user->name}";
        $data = ['demande_id' => $demande->id, 'type_demande' => $demande->type_demande];

        return self::notifierAdmins($titre, $message, 'info', $data);
    }

    /**
     * Changement de statut de demande
     */
    public static function notifierStatutDemande($demande)
    {
        $titre = 'Mise à jour de demande';
        $message = "Votre demande #{$demande->numero_demande} a été {$demande->statut}";
        
        $type = match($demande->statut) {
            'acceptee' => 'success',
            'refusee' => 'error',
            'terminee' => 'success',
            default => 'info'
        };

        $data = [
            'demande_id' => $demande->id,
            'statut' => $demande->statut,
            'commentaire' => $demande->commentaire_admin
        ];

        return self::creer($demande->user_id, $titre, $message, $type, $data);
    }

    /**
     * Composant défaillant
     */
    public static function notifierComposantDefaillant($composant)
    {
        $titre = 'Composant défaillant';
        $message = "Le composant '{$composant->nom}' de la machine '{$composant->machine->nom}' est défaillant";
        
        $data = [
            'composant_id' => $composant->id,
            'machine_id' => $composant->machine_id,
            'machine_nom' => $composant->machine->nom,
            'composant_nom' => $composant->nom
        ];

        return self::notifierAdmins($titre, $message, 'error', $data);
    }

    /**
     * Machine en maintenance
     */
    public static function notifierMaintenanceMachine($machine)
    {
        $titre = 'Machine en maintenance';
        $message = "La machine '{$machine->nom}' est passée en mode maintenance";
        
        $data = [
            'machine_id' => $machine->id,
            'machine_nom' => $machine->nom,
            'localisation' => $machine->localisation
        ];

        return self::notifierAdmins($titre, $message, 'warning', $data);
    }

    /**
     * Inspection à faire
     */
    public static function notifierInspectionDue($composant)
    {
        $titre = 'Inspection requise';
        $message = "Le composant '{$composant->nom}' nécessite une inspection";
        
        $data = [
            'composant_id' => $composant->id,
            'machine_id' => $composant->machine_id,
            'prochaine_inspection' => $composant->prochaine_inspection
        ];

        return self::notifierAdmins($titre, $message, 'warning', $data);
    }

    // ========================================
    // MÉTHODES D'INSTANCE
    // ========================================

    /**
     * Marquer comme lue
     */
    public function marquerCommeLue()
    {
        $this->update([
            'lu' => true,
            'lu_le' => now()
        ]);
        
        return $this;
    }

    /**
     * Marquer comme non lue
     */
    public function marquerCommeNonLue()
    {
        $this->update([
            'lu' => false,
            'lu_le' => null
        ]);
        
        return $this;
    }

    // ========================================
    // ACCESSEURS (pour l'affichage)
    // ========================================

    /**
     * Couleur selon le type
     */
    public function getTypeColorAttribute()
    {
        return match($this->type) {
            'success' => 'green',
            'error' => 'red',
            'warning' => 'orange',
            'info' => 'blue',
            default => 'gray'
        };
    }

    /**
     * Icône selon le type
     */
    public function getTypeIconAttribute()
    {
        return match($this->type) {
            'success' => 'check-circle',
            'error' => 'x-circle',
            'warning' => 'exclamation-triangle',
            'info' => 'information-circle',
            default => 'bell'
        };
    }

    /**
     * Temps écoulé depuis la création
     */
    public function getTempsEcouleAttribute()
    {
        return $this->created_at->diffForHumans();
    }

    /**
     * Format court du message (pour les listes)
     */
    public function getMessageCourtAttribute()
    {
        return strlen($this->message) > 100 
            ? substr($this->message, 0, 100) . '...' 
            : $this->message;
    }

    /**
     * Vérifier si la notification est récente (moins de 24h)
     */
    public function getEstRecenteAttribute()
    {
        return $this->created_at->diffInHours(now()) < 24;
    }

    /**
     * Vérifier si la notification est urgente
     */
    public function getEstUrgenteAttribute()
    {
        return in_array($this->type, ['error', 'warning']);
    }

    // ========================================
    // MÉTHODES UTILITAIRES
    // ========================================

    /**
     * Supprimer les notifications anciennes
     */
    public static function nettoyerAnnciennes($jours = 30)
    {
        return self::where('created_at', '<', now()->subDays($jours))->delete();
    }

    /**
     * Marquer toutes comme lues pour un utilisateur
     */
    public static function marquerToutesLues($userId)
    {
        return self::where('user_id', $userId)
                  ->where('lu', false)
                  ->update([
                      'lu' => true,
                      'lu_le' => now()
                  ]);
    }

    /**
     * Compter les non lues pour un utilisateur
     */
    public static function compterNonLues($userId)
    {
        return self::where('user_id', $userId)->where('lu', false)->count();
    }

    /**
     * Obtenir les statistiques pour un utilisateur
     */
    public static function statistiquesUtilisateur($userId)
    {
        return [
            'total' => self::where('user_id', $userId)->count(),
            'non_lues' => self::where('user_id', $userId)->where('lu', false)->count(),
            'lues' => self::where('user_id', $userId)->where('lu', true)->count(),
            'recentes' => self::where('user_id', $userId)->recentes()->count(),
            'urgentes' => self::where('user_id', $userId)->whereIn('type', ['error', 'warning'])->count(),
        ];
    }
}