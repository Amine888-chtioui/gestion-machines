<?php
// app/Models/Composant.php - Version mise à jour avec gestion d'images

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Composant extends Model
{
    use HasFactory;

    protected $fillable = [
        'nom', 'reference', 'machine_id', 'type_id', 'description', 'statut',
        'quantite', 'prix_unitaire', 'fournisseur', 'date_installation',
        'derniere_inspection', 'prochaine_inspection', 'duree_vie_estimee',
        'notes', 'caracteristiques', 'image_path'
    ];

    protected $casts = [
        'date_installation' => 'date',
        'derniere_inspection' => 'date',
        'prochaine_inspection' => 'date',
        'prix_unitaire' => 'decimal:2',
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
    public function scopeDefaillants($query)
    {
        return $query->where('statut', 'defaillant');
    }

    public function scopeUsures($query)
    {
        return $query->where('statut', 'usure');
    }

    public function scopeAInspecter($query)
    {
        return $query->where('prochaine_inspection', '<=', now()->addDays(7));
    }

    // Accesseurs
    public function getPrixTotalAttribute()
    {
        return $this->prix_unitaire * $this->quantite;
    }

    public function getAgeAttribute()
    {
        return $this->date_installation 
            ? $this->date_installation->diffInMonths(now()) 
            : null;
    }

    public function getStatutInspectionAttribute()
    {
        if (!$this->prochaine_inspection) {
            return 'Non programmée';
        }
        
        $jours = now()->diffInDays($this->prochaine_inspection);
        
        if ($this->prochaine_inspection < now()) {
            return 'En retard';
        } elseif ($jours <= 7) {
            return 'Bientôt';
        }
        
        return 'Programmée';
    }
}