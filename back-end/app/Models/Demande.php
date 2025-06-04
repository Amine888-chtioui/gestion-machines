<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Demande extends Model
{
    use HasFactory;

    protected $fillable = [
        'numero_demande', 'user_id', 'machine_id', 'composant_id', 'type_demande',
        'priorite', 'statut', 'titre', 'description', 'justification',
        'quantite_demandee', 'budget_estime', 'date_souhaite', 'traite_par',
        'commentaire_admin', 'date_traitement'
    ];

    protected $casts = [
        'date_souhaite' => 'date',
        'date_traitement' => 'datetime',
        'budget_estime' => 'decimal:2',
    ];

    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($demande) {
            $demande->numero_demande = 'DEM-' . now()->format('Y') . '-' . str_pad(
                Demande::whereYear('created_at', now()->year)->count() + 1, 
                4, '0', STR_PAD_LEFT
            );
        });
    }

    // Relations
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function machine()
    {
        return $this->belongsTo(Machine::class);
    }

    public function composant()
    {
        return $this->belongsTo(Composant::class);
    }

    public function traitePar()
    {
        return $this->belongsTo(User::class, 'traite_par');
    }

    // Scopes
    public function scopeEnAttente($query)
    {
        return $query->where('statut', 'en_attente');
    }

    public function scopeUrgentes($query)
    {
        return $query->whereIn('priorite', ['haute', 'critique']);
    }

    // Méthodes d'action
    public function accepter($admin, $commentaire = null)
    {
        $this->update([
            'statut' => 'acceptee',
            'traite_par' => $admin->id,
            'date_traitement' => now(),
            'commentaire_admin' => $commentaire
        ]);
        
        Notification::notifierStatutDemande($this);
    }

    public function refuser($admin, $commentaire)
    {
        $this->update([
            'statut' => 'refusee',
            'traite_par' => $admin->id,
            'date_traitement' => now(),
            'commentaire_admin' => $commentaire
        ]);
        
        Notification::notifierStatutDemande($this);
    }

    public function marquerCommeTraitee($admin, $commentaire = null)
    {
        $this->update([
            'traite_par' => $admin->id,
            'date_traitement' => now(),
            'commentaire_admin' => $commentaire
        ]);
    }
}