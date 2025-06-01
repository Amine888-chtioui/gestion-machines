<?php
// app/Models/Machine.php - Version corrigée pour l'affichage d'images

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;

class Machine extends Model
{
    use HasFactory;

    protected $fillable = [
        'nom',
        'numero_serie',
        'modele',
        'description',
        'localisation',
        'statut',
        'date_installation',
        'derniere_maintenance',
        'specifications_techniques',
        'image_path',
    ];

    protected $casts = [
        'date_installation' => 'date',
        'derniere_maintenance' => 'date',
        'specifications_techniques' => 'array',
    ];

    // Relations
    public function composants()
    {
        return $this->hasMany(Composant::class);
    }

    public function demandes()
    {
        return $this->hasMany(Demande::class);
    }

    // Scopes
    public function scopeActives($query)
    {
        return $query->where('statut', 'actif');
    }

    public function scopeParLocalisation($query, $localisation)
    {
        return $query->where('localisation', 'like', "%{$localisation}%");
    }

    public function scopeParModele($query, $modele)
    {
        return $query->where('modele', 'like', "%{$modele}%");
    }

    public function scopeNecessiteMaintenace($query)
    {
        return $query->where('derniere_maintenance', '<', Carbon::now()->subMonths(6));
    }

    // Accesseurs pour l'image (CORRIGES)
    public function getImageUrlAttribute()
    {
        if (empty($this->image_path)) {
            return null;
        }

        // Vérifier si le fichier existe réellement
        if (Storage::disk('public')->exists($this->image_path)) {
            // Construire l'URL complète
            $baseUrl = config('app.url');
            return $baseUrl . '/storage/' . $this->image_path;
        }

        return null;
    }

    public function getHasImageAttribute()
    {
        return !empty($this->image_path) && Storage::disk('public')->exists($this->image_path);
    }

    // Méthode pour obtenir l'URL d'image avec fallback
    public function getImageUrlWithFallbackAttribute()
    {
        $imageUrl = $this->image_url;
        
        if ($imageUrl) {
            return $imageUrl;
        }
        
        // URL d'image par défaut ou placeholder
        return config('app.url') . '/images/machine-placeholder.png';
    }

    // Accesseurs existants
    public function getNombreComposantsAttribute()
    {
        return $this->composants()->count();
    }

    public function getComposantsDefaillants()
    {
        return $this->composants()->where('statut', 'defaillant')->count();
    }

    public function getTempsDepuisMaintenanceAttribute()
    {
        if (!$this->derniere_maintenance) {
            return null;
        }
        return $this->derniere_maintenance->diffInDays(Carbon::now());
    }

    public function getStatutMaintenanceAttribute()
    {
        $jours = $this->temps_depuis_maintenance;
        if ($jours === null) return 'non_defini';
        if ($jours > 180) return 'critique';
        if ($jours > 120) return 'attention';
        return 'ok';
    }

    // Méthode pour supprimer l'ancienne image
    public function deleteOldImage()
    {
        if ($this->image_path && Storage::disk('public')->exists($this->image_path)) {
            Storage::disk('public')->delete($this->image_path);
        }
    }

    // Événement pour supprimer l'image lors de la suppression de la machine
    protected static function boot()
    {
        parent::boot();

        static::deleting(function ($machine) {
            $machine->deleteOldImage();
        });
    }
}