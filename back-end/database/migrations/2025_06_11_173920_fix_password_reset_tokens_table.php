<?php
// database/migrations/2025_06_11_173920_fix_password_reset_tokens_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Supprimer la table existante
        Schema::dropIfExists('password_reset_tokens');
        
        // Créer la nouvelle table correcte avec valeurs par défaut
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->id();
            $table->string('email')->index();
            $table->string('token')->nullable();
            $table->string('verification_code', 6);
            $table->string('reset_token')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamp('expires_at')->useCurrent(); // Valeur par défaut
            $table->timestamp('created_at')->useCurrent(); // Valeur par défaut
            $table->timestamp('updated_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('password_reset_tokens');
    }
};