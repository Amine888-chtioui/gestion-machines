<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Machine extends Model
{
    use HasFactory;

    protected $fillable = [
        'nom', 'numero_serie', 'modele', 'description', 'localisation',
        'statut', 'date_installation', 'derniere_maintenance',
        'specifications_techniques', 'image_path'
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

    public function scopeNecessiteMaintenace($query)
    {
        return $query->where('derniere_maintenance', '<', now()->subMonths(6))
                    ->orWhereNull('derniere_maintenance');
    }

    // Accesseurs
    public function getNombreComposantsAttribute()
    {
        return $this->composants()->count();
    }

    public function getStatutMaintenanceAttribute()
    {
        if (!$this->derniere_maintenance) {
            return 'Jamais maintenu';
        }
        
        $mois = $this->derniere_maintenance->diffInMonths(now());
        
        if ($mois > 12) return 'Maintenance urgente';
        if ($mois > 6) return 'Maintenance recommandée';
        return 'Maintenance à jour';
    }
}