<?php
// app/Models/Machine.php - Version corrigée pour l'affichage d'images

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

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

    // Ajouter les accesseurs à la liste des attributs ajoutés automatiquement
    protected $appends = [];

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

    // Accesseurs pour l'image (CORRIGES ET OPTIMISES)
    public function getImageUrlAttribute()
    {
        try {
            if (empty($this->image_path)) {
                return null;
            }

            // Vérifier si le fichier existe réellement
            if (!Storage::disk('public')->exists($this->image_path)) {
                Log::warning('Image manquante pour machine:', [
                    'machine_id' => $this->id,
                    'image_path' => $this->image_path
                ]);
                return null;
            }

            // Construire l'URL complète avec le bon format
            return url('storage/' . $this->image_path);
            
        } catch (\Exception $e) {
            Log::error('Erreur lors de la génération de l\'URL d\'image:', [
                'machine_id' => $this->id,
                'image_path' => $this->image_path,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    public function getHasImageAttribute()
    {
        try {
            return !empty($this->image_path) && Storage::disk('public')->exists($this->image_path);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la vérification d\'image:', [
                'machine_id' => $this->id,
                'image_path' => $this->image_path,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    // Méthode pour obtenir l'URL d'image avec fallback
    public function getImageUrlWithFallbackAttribute()
    {
        $imageUrl = $this->image_url;
        
        if ($imageUrl) {
            return $imageUrl;
        }
        
        // URL d'image par défaut ou placeholder
        return url('/images/machine-placeholder.png');
    }

    // Méthode pour obtenir les informations complètes de l'image
    public function getImageInfoAttribute()
    {
        if (!$this->has_image) {
            return null;
        }

        try {
            $fullPath = Storage::disk('public')->path($this->image_path);
            $size = Storage::disk('public')->size($this->image_path);
            
            return [
                'url' => $this->image_url,
                'path' => $this->image_path,
                'size' => $size,
                'size_human' => $this->formatBytes($size),
                'exists' => true,
                'full_path' => $fullPath
            ];
        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des infos image:', [
                'machine_id' => $this->id,
                'error' => $e->getMessage()
            ]);
            return null;
        }
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

    // Méthode pour formater les tailles de fichier
    private function formatBytes($size, $precision = 2)
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        
        for ($i = 0; $size > 1024 && $i < count($units) - 1; $i++) {
            $size /= 1024;
        }
        
        return round($size, $precision) . ' ' . $units[$i];
    }

    // Méthode pour supprimer l'ancienne image
    public function deleteOldImage()
    {
        try {
            if ($this->image_path && Storage::disk('public')->exists($this->image_path)) {
                Storage::disk('public')->delete($this->image_path);
                Log::info('Image supprimée:', [
                    'machine_id' => $this->id,
                    'image_path' => $this->image_path
                ]);
                return true;
            }
        } catch (\Exception $e) {
            Log::error('Erreur lors de la suppression d\'image:', [
                'machine_id' => $this->id,
                'image_path' => $this->image_path,
                'error' => $e->getMessage()
            ]);
        }
        return false;
    }

    // Méthode pour valider une image avant upload
    public static function validateImageFile($file)
    {
        $errors = [];
        
        if (!$file) {
            return ['valid' => true, 'errors' => []];
        }

        // Vérifier le type MIME
        $allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
        if (!in_array($file->getMimeType(), $allowedMimes)) {
            $errors[] = 'Type de fichier non autorisé. Utilisez: JPG, PNG, GIF';
        }

        // Vérifier la taille (2MB max)
        $maxSize = 2 * 1024 * 1024; // 2MB
        if ($file->getSize() > $maxSize) {
            $errors[] = 'L\'image ne doit pas dépasser 2MB';
        }

        // Vérifier les dimensions si c'est une image
        try {
            $imageInfo = getimagesize($file->getPathname());
            if ($imageInfo) {
                $width = $imageInfo[0];
                $height = $imageInfo[1];
                
                if ($width < 100 || $height < 100) {
                    $errors[] = 'L\'image doit faire au moins 100x100 pixels';
                }
                
                if ($width > 2000 || $height > 2000) {
                    $errors[] = 'L\'image ne doit pas dépasser 2000x2000 pixels';
                }
            }
        } catch (\Exception $e) {
            $errors[] = 'Impossible de lire les dimensions de l\'image';
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors
        ];
    }

    // Méthode pour régénérer l'URL d'image (utile pour le debugging)
    public function refreshImageUrl()
    {
        if ($this->image_path) {
            return $this->image_url; // Force le recalcul
        }
        return null;
    }

    // Événements du modèle
    protected static function boot()
    {
        parent::boot();

        // Supprimer l'image lors de la suppression de la machine
        static::deleting(function ($machine) {
            $machine->deleteOldImage();
        });

        // Log lors de la création
        static::created(function ($machine) {
            Log::info('Machine créée:', [
                'machine_id' => $machine->id,
                'nom' => $machine->nom,
                'has_image' => !empty($machine->image_path)
            ]);
        });

        // Log lors de la mise à jour
        static::updated(function ($machine) {
            $changes = $machine->getChanges();
            if (array_key_exists('image_path', $changes)) {
                Log::info('Image machine mise à jour:', [
                    'machine_id' => $machine->id,
                    'old_image' => $machine->getOriginal('image_path'),
                    'new_image' => $machine->image_path
                ]);
            }
        });
    }

    // Méthode pour obtenir toutes les données nécessaires à l'affichage
    public function getDisplayDataAttribute()
    {
        return [
            'id' => $this->id,
            'nom' => $this->nom,
            'numero_serie' => $this->numero_serie,
            'modele' => $this->modele,
            'statut' => $this->statut,
            'localisation' => $this->localisation,
            'description' => $this->description,
            'image_url' => $this->image_url,
            'has_image' => $this->has_image,
            'image_info' => $this->image_info,
            'composants_count' => $this->composants()->count(),
            'demandes_count' => $this->demandes()->count(),
            'statut_maintenance' => $this->statut_maintenance,
            'temps_depuis_maintenance' => $this->temps_depuis_maintenance,
            'date_installation' => $this->date_installation?->format('d/m/Y'),
            'derniere_maintenance' => $this->derniere_maintenance?->format('d/m/Y'),
            'created_at' => $this->created_at->format('d/m/Y H:i'),
            'updated_at' => $this->updated_at->format('d/m/Y H:i'),
        ];
    }

    // Méthode pour nettoyer les images orphelines (à utiliser avec une commande artisan)
    public static function cleanOrphanImages()
    {
        $machineImages = self::whereNotNull('image_path')->pluck('image_path')->toArray();
        $storageFiles = Storage::disk('public')->files('machines');
        
        $orphanFiles = array_diff($storageFiles, $machineImages);
        $deletedCount = 0;
        
        foreach ($orphanFiles as $file) {
            try {
                Storage::disk('public')->delete($file);
                $deletedCount++;
                Log::info('Image orpheline supprimée:', ['file' => $file]);
            } catch (\Exception $e) {
                Log::error('Erreur suppression image orpheline:', [
                    'file' => $file,
                    'error' => $e->getMessage()
                ]);
            }
        }
        
        return [
            'total_orphans' => count($orphanFiles),
            'deleted' => $deletedCount
        ];
    }
}