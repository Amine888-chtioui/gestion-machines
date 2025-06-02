<?php
// database/migrations/2025_06_01_160000_add_image_to_composants_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('composants', function (Blueprint $table) {
            $table->string('image_path')->nullable()->after('caracteristiques');
        });
    }

    public function down(): void
    {
        Schema::table('composants', function (Blueprint $table) {
            $table->dropColumn('image_path');
        });
    }
};