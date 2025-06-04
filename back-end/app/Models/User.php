<?php
// app/Models/User.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory;

    protected $fillable = [
        'name', 'email', 'password', 'role', 'actif', 'derniere_connexion'
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'derniere_connexion' => 'datetime',
        'password' => 'hashed',
        'actif' => 'boolean',
    ];

    // Relations
    public function demandes()
    {
        return $this->hasMany(Demande::class);
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }

    public function demandesTraitees()
    {
        return $this->hasMany(Demande::class, 'traite_par');
    }

    // Méthodes utilitaires
    public function isAdmin()
    {
        return $this->role === 'admin';
    }

    public function isUser()
    {
        return $this->role === 'user';
    }
}