<?php
// app/Models/Composant.php - Version mise à jour avec gestion d'images

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class Composant extends Model
{
    use HasFactory;

    protected $fillable = [
        'nom',
        'reference',
        'machine_id',
        'type_id',
        'description',
        'statut',
        'quantite',
        'prix_unitaire',
        'fournisseur',
        'date_installation',
        'derniere_inspection',
        'prochaine_inspection',
        'duree_vie_estimee',
        'notes',
        'caracteristiques',
        'image_path',
    ];

    protected $casts = [
        'date_installation' => 'date',
        'derniere_inspection' => 'date',
        'prochaine_inspection' => 'date',
        'prix_unitaire' => 'decimal:2',
        'quantite' => 'integer',
        'duree_vie_estimee' => 'integer',
        'caracteristiques' => 'array',
    ];

    // Relations
    public function machine()
    {
        return $this->belongsTo(Machine::class);
    }

    public function type()
    {
        return $this->belongsTo(Type::class);
    }

    public function demandes()
    {
        return $this->hasMany(Demande::class);
    }

    // Scopes
    public function scopeParStatut($query, $statut)
    {
        return $query->where('statut', $statut);
    }

    public function scopeParType($query, $typeId)
    {
        return $query->where('type_id', $typeId);
    }

    public function scopeParMachine($query, $machineId)
    {
        return $query->where('machine_id', $machineId);
    }

    public function scopeDefaillants($query)
    {
        return $query->where('statut', 'defaillant');
    }

    public function scopeAInspecter($query)
    {
        return $query->where('prochaine_inspection', '<=', Carbon::now()->addDays(7));
    }

    public function scopeUsures($query)
    {
        return $query->where('statut', 'usure');
    }

    // Accesseurs pour l'image
    public function getImageUrlAttribute()
    {
        try {
            if (empty($this->image_path)) {
                return null;
            }

            // Vérifier si le fichier existe réellement
            if (!Storage::disk('public')->exists($this->image_path)) {
                Log::warning('Image manquante pour composant:', [
                    'composant_id' => $this->id,
                    'image_path' => $this->image_path
                ]);
                return null;
            }

            // Construire l'URL complète
            return url('storage/' . $this->image_path);
            
        } catch (\Exception $e) {
            Log::error('Erreur lors de la génération de l\'URL d\'image composant:', [
                'composant_id' => $this->id,
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
            Log::error('Erreur lors de la vérification d\'image composant:', [
                'composant_id' => $this->id,
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
        return url('/images/composant-placeholder.png');
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
            Log::error('Erreur lors de la récupération des infos image composant:', [
                'composant_id' => $this->id,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    // Accesseurs existants
    public function getPrixTotalAttribute()
    {
        return $this->prix_unitaire * $this->quantite;
    }

    public function getAgeAttribute()
    {
        if (!$this->date_installation) {
            return null;
        }
        return $this->date_installation->diffInMonths(Carbon::now());
    }

    public function getStatutInspectionAttribute()
    {
        if (!$this->prochaine_inspection) {
            return 'non_programme';
        }
        
        $jours = Carbon::now()->diffInDays($this->prochaine_inspection, false);
        
        if ($jours < 0) return 'en_retard';
        if ($jours <= 7) return 'urgent';
        if ($jours <= 30) return 'proche';
        return 'ok';
    }

    public function getPourcentageVieAttribute()
    {
        if (!$this->duree_vie_estimee || !$this->date_installation) {
            return null;
        }
        
        $ageEnMois = $this->age;
        return min(100, ($ageEnMois / $this->duree_vie_estimee) * 100);
    }

    // Méthodes utilitaires pour l'image
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
                Log::info('Image composant supprimée:', [
                    'composant_id' => $this->id,
                    'image_path' => $this->image_path
                ]);
                return true;
            }
        } catch (\Exception $e) {
            Log::error('Erreur lors de la suppression d\'image composant:', [
                'composant_id' => $this->id,
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

    // Vérifier le type MIME (plus permissif)
    $allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
    if (!in_array($file->getMimeType(), $allowedMimes)) {
        $errors[] = 'Type de fichier non autorisé. Utilisez: JPG, PNG, GIF, WEBP';
    }

    // Vérifier la taille (5MB max)
    $maxSize = 5 * 1024 * 1024; // 5MB
    if ($file->getSize() > $maxSize) {
        $errors[] = 'L\'image ne doit pas dépasser 5MB';
    }

    // Vérifier les dimensions si c'est une image (plus permissif)
    try {
        $imageInfo = getimagesize($file->getPathname());
        if ($imageInfo) {
            $width = $imageInfo[0];
            $height = $imageInfo[1];
            
            if ($width < 50 || $height < 50) {
                $errors[] = 'L\'image doit faire au moins 50x50 pixels';
            }
            
            if ($width > 4000 || $height > 4000) {
                $errors[] = 'L\'image ne doit pas dépasser 4000x4000 pixels';
            }
        }
    } catch (\Exception $e) {
        // Si on ne peut pas lire les dimensions, on ne considère pas ça comme une erreur
        \Log::warning('Impossible de lire les dimensions de l\'image: ' . $e->getMessage());
    }

    return [
        'valid' => empty($errors),
        'errors' => $errors
    ];
}

    // Méthode pour régénérer l'URL d'image
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

    // Validation et nettoyage avant création
    static::creating(function ($composant) {
        // Nettoyer duree_vie_estimee
        if ($composant->duree_vie_estimee === 'null' || $composant->duree_vie_estimee === '') {
            $composant->duree_vie_estimee = null;
        }
        
        // Nettoyer les champs texte vides
        foreach (['description', 'notes', 'fournisseur'] as $field) {
            if ($composant->$field === '' || $composant->$field === 'null') {
                $composant->$field = null;
            }
        }
        
        // S'assurer que quantite est au moins 1
        if (empty($composant->quantite) || $composant->quantite < 1) {
            $composant->quantite = 1;
        }
    });

    // Même nettoyage pour la mise à jour
    static::updating(function ($composant) {
        // Nettoyer duree_vie_estimee
        if ($composant->duree_vie_estimee === 'null' || $composant->duree_vie_estimee === '') {
            $composant->duree_vie_estimee = null;
        }
        
        // Nettoyer les champs texte vides
        foreach (['description', 'notes', 'fournisseur'] as $field) {
            if ($composant->$field === '' || $composant->$field === 'null') {
                $composant->$field = null;
            }
        }
    });

    // Supprimer l'image lors de la suppression du composant
    static::deleting(function ($composant) {
        $composant->deleteOldImage();
    });

    // Log lors de la création
    static::created(function ($composant) {
        Log::info('Composant créé:', [
            'composant_id' => $composant->id,
            'nom' => $composant->nom,
            'has_image' => !empty($composant->image_path)
        ]);
    });

    // Log lors de la mise à jour
    static::updated(function ($composant) {
        $changes = $composant->getChanges();
        if (array_key_exists('image_path', $changes)) {
            Log::info('Image composant mise à jour:', [
                'composant_id' => $composant->id,
                'old_image' => $composant->getOriginal('image_path'),
                'new_image' => $composant->image_path
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
            'reference' => $this->reference,
            'statut' => $this->statut,
            'description' => $this->description,
            'image_url' => $this->image_url,
            'has_image' => $this->has_image,
            'image_info' => $this->image_info,
            'machine' => $this->machine,
            'type' => $this->type,
            'quantite' => $this->quantite,
            'prix_unitaire' => $this->prix_unitaire,
            'prix_total' => $this->prix_total,
            'fournisseur' => $this->fournisseur,
            'age' => $this->age,
            'statut_inspection' => $this->statut_inspection,
            'pourcentage_vie' => $this->pourcentage_vie,
            'date_installation' => $this->date_installation?->format('d/m/Y'),
            'derniere_inspection' => $this->derniere_inspection?->format('d/m/Y'),
            'prochaine_inspection' => $this->prochaine_inspection?->format('d/m/Y'),
            'created_at' => $this->created_at->format('d/m/Y H:i'),
            'updated_at' => $this->updated_at->format('d/m/Y H:i'),
        ];
    }

    // Méthode pour nettoyer les images orphelines
    public static function cleanOrphanImages()
    {
        $composantImages = self::whereNotNull('image_path')->pluck('image_path')->toArray();
        $storageFiles = Storage::disk('public')->files('composants');
        
        $orphanFiles = array_diff($storageFiles, $composantImages);
        $deletedCount = 0;
        
        foreach ($orphanFiles as $file) {
            try {
                Storage::disk('public')->delete($file);
                $deletedCount++;
                Log::info('Image orpheline composant supprimée:', ['file' => $file]);
            } catch (\Exception $e) {
                Log::error('Erreur suppression image orpheline composant:', [
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