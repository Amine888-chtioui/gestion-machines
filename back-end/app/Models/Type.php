<?php
// app/Models/Type.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Type extends Model
{
    use HasFactory;

    protected $fillable = [
        'nom',
        'description',
        'couleur',
        'actif'
    ];

    protected $casts = [
        'actif' => 'boolean',
    ];

    // Valeurs par défaut
    protected $attributes = [
        'couleur' => '#007bff',
        'actif' => true,
    ];

    // ========================================
    // RELATIONS
    // ========================================

    public function composants()
    {
        return $this->hasMany(Composant::class);
    }

    // ========================================
    // SCOPES (pour requêtes fréquentes)
    // ========================================

    public function scopeActifs($query)
    {
        return $query->where('actif', true);
    }

    public function scopeInactifs($query)
    {
        return $query->where('actif', false);
    }

    public function scopeAvecComposants($query)
    {
        return $query->has('composants');
    }

    public function scopeSansComposants($query)
    {
        return $query->doesntHave('composants');
    }

    public function scopeParNom($query, $nom)
    {
        return $query->where('nom', 'like', '%' . $nom . '%');
    }

    public function scopeOrdonneParNom($query, $direction = 'asc')
    {
        return $query->orderBy('nom', $direction);
    }

    // ========================================
    // MÉTHODES STATIQUES
    // ========================================

    /**
     * Créer un nouveau type avec valeurs par défaut
     */
    public static function creer($nom, $description = null, $couleur = '#007bff')
    {
        return self::create([
            'nom' => $nom,
            'description' => $description,
            'couleur' => $couleur,
            'actif' => true,
        ]);
    }

    /**
     * Obtenir tous les types actifs pour les sélecteurs
     */
    public static function pourSelecteur()
    {
        return self::actifs()
                  ->ordonneParNom()
                  ->get(['id', 'nom', 'couleur']);
    }

    /**
     * Obtenir les statistiques globales des types
     */
    public static function statistiques()
    {
        return [
            'total' => self::count(),
            'actifs' => self::actifs()->count(),
            'inactifs' => self::inactifs()->count(),
            'avec_composants' => self::avecComposants()->count(),
            'sans_composants' => self::sansComposants()->count(),
            'total_composants' => \App\Models\Composant::count(),
        ];
    }

    /**
     * Rechercher des types
     */
    public static function rechercher($terme, $actifSeulement = true)
    {
        $query = self::parNom($terme);
        
        if ($actifSeulement) {
            $query->actifs();
        }
        
        return $query->ordonneParNom()->get();
    }

    /**
     * Obtenir les types les plus utilisés
     */
    public static function lesPlusUtilises($limite = 10)
    {
        return self::withCount('composants')
                  ->orderBy('composants_count', 'desc')
                  ->take($limite)
                  ->get();
    }

    // ========================================
    // MÉTHODES D'INSTANCE
    // ========================================

    /**
     * Activer le type
     */
    public function activer()
    {
        $this->update(['actif' => true]);
        return $this;
    }

    /**
     * Désactiver le type
     */
    public function desactiver()
    {
        $this->update(['actif' => false]);
        return $this;
    }

    /**
     * Basculer le statut actif/inactif
     */
    public function basculerStatut()
    {
        $this->update(['actif' => !$this->actif]);
        return $this;
    }

    /**
     * Vérifier si le type peut être supprimé
     */
    public function peutEtreSuprime()
    {
        return $this->composants()->count() === 0;
    }

    /**
     * Supprimer le type (avec vérification)
     */
    public function supprimerAvecVerification()
    {
        if (!$this->peutEtreSuprime()) {
            throw new \Exception('Impossible de supprimer ce type car il est utilisé par des composants');
        }

        return $this->delete();
    }

    /**
     * Dupliquer le type
     */
    public function dupliquer($nouveauNom = null)
    {
        $nouveauNom = $nouveauNom ?: $this->nom . ' (Copie)';
        
        return self::create([
            'nom' => $nouveauNom,
            'description' => $this->description,
            'couleur' => $this->couleur,
            'actif' => $this->actif,
        ]);
    }

    // ========================================
    // ACCESSEURS
    // ========================================

    /**
     * Obtenir le nombre de composants
     */
    public function getNombreComposantsAttribute()
    {
        return $this->composants()->count();
    }

    /**
     * Vérifier si le type est utilisé
     */
    public function getEstUtiliseAttribute()
    {
        return $this->composants()->count() > 0;
    }

    /**
     * Obtenir le statut formaté
     */
    public function getStatutFormatAttribute()
    {
        return $this->actif ? 'Actif' : 'Inactif';
    }

    /**
     * Obtenir la couleur avec alpha (pour les fonds)
     */
    public function getCouleurAlphaAttribute()
    {
        // Convertir hex en rgba avec transparence
        $hex = str_replace('#', '', $this->couleur);
        $r = hexdec(substr($hex, 0, 2));
        $g = hexdec(substr($hex, 2, 2));
        $b = hexdec(substr($hex, 4, 2));
        
        return "rgba($r, $g, $b, 0.1)";
    }

    /**
     * Obtenir une couleur contrastée pour le texte
     */
    public function getCouleurTexteAttribute()
    {
        // Calculer la luminance pour déterminer si utiliser du texte noir ou blanc
        $hex = str_replace('#', '', $this->couleur);
        $r = hexdec(substr($hex, 0, 2));
        $g = hexdec(substr($hex, 2, 2));
        $b = hexdec(substr($hex, 4, 2));
        
        $luminance = (0.299 * $r + 0.587 * $g + 0.114 * $b) / 255;
        
        return $luminance > 0.5 ? '#000000' : '#ffffff';
    }

    /**
     * Obtenir le nom avec le nombre de composants
     */
    public function getNomCompletAttribute()
    {
        $count = $this->composants()->count();
        return $this->nom . " ($count composant" . ($count > 1 ? 's' : '') . ")";
    }

    // ========================================
    // MUTATEURS
    // ========================================

    /**
     * S'assurer que le nom est capitalisé
     */
    public function setNomAttribute($value)
    {
        $this->attributes['nom'] = ucfirst(trim($value));
    }

    /**
     * Valider et formater la couleur
     */
    public function setCouleurAttribute($value)
    {
        // S'assurer que la couleur commence par #
        if ($value && !str_starts_with($value, '#')) {
            $value = '#' . $value;
        }
        
        // Valider le format hex
        if ($value && !preg_match('/^#[0-9A-Fa-f]{6}$/', $value)) {
            $value = '#007bff'; // Couleur par défaut si invalide
        }
        
        $this->attributes['couleur'] = $value ?: '#007bff';
    }

    // ========================================
    // MÉTHODES UTILITAIRES
    // ========================================

    /**
     * Exporter les données du type pour backup
     */
    public function exporter()
    {
        return [
            'nom' => $this->nom,
            'description' => $this->description,
            'couleur' => $this->couleur,
            'actif' => $this->actif,
            'nombre_composants' => $this->composants()->count(),
            'created_at' => $this->created_at->toISOString(),
        ];
    }

    /**
     * Obtenir les composants par statut
     */
    public function composantsParStatut()
    {
        return $this->composants()
                   ->selectRaw('statut, COUNT(*) as total')
                   ->groupBy('statut')
                   ->pluck('total', 'statut')
                   ->toArray();
    }

    /**
     * Obtenir un échantillon de composants
     */
    public function echantillonComposants($limite = 5)
    {
        return $this->composants()
                   ->with('machine')
                   ->latest()
                   ->take($limite)
                   ->get(['id', 'nom', 'statut', 'machine_id']);
    }

    /**
     * Obtenir un résumé du type
     */
    public function resume()
    {
        return [
            'id' => $this->id,
            'nom' => $this->nom,
            'couleur' => $this->couleur,
            'actif' => $this->actif,
            'total_composants' => $this->composants()->count(),
            'composants_bon' => $this->composants()->where('statut', 'bon')->count(),
            'composants_defaillant' => $this->composants()->where('statut', 'defaillant')->count(),
            'derniere_utilisation' => $this->composants()->latest()->first()?->created_at,
        ];
    }
}