<?php
// app/Models/PasswordReset.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PasswordReset extends Model
{
    /**
     * La table associée au modèle.
     */
    protected $table = 'password_resets';

    /**
     * Indique si le modèle doit utiliser les timestamps.
     */
    public $timestamps = false;

    /**
     * Les attributs qui sont assignables en masse.
     */
    protected $fillable = [
        'email',
        'token',
        'created_at',
    ];

    /**
     * Les attributs qui doivent être castés.
     */
    protected $casts = [
        'created_at' => 'datetime',
    ];

    /**
     * Définir la clé primaire.
     */
    protected $primaryKey = null;
    public $incrementing = false;
}