<?php
// app/Http/Controllers/Api/AuthController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use App\Mail\ResetPasswordMail;
use App\Mail\VerificationCodeMail;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Les informations d\'identification sont incorrectes.'],
            ]);
        }

        if (!$user->actif) {
            return response()->json([
                'message' => 'Votre compte est désactivé. Contactez l\'administrateur.'
            ], 403);
        }

        // Mise à jour connexion et création token
        $user->update(['derniere_connexion' => now()]);
        $user->tokens()->delete();
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Connexion réussie',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'derniere_connexion' => $user->derniere_connexion,
            ],
            'token' => $token,
        ]);
    }

    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'role' => 'sometimes|in:user,admin'
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role ?? 'user',
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Inscription réussie',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
            'token' => $token,
        ], 201);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        
        return response()->json([
            'message' => 'Déconnexion réussie'
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        
        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'actif' => $user->actif,
                'derniere_connexion' => $user->derniere_connexion,
                'created_at' => $user->created_at,
            ]
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|string|email|max:255|unique:users,email,' . $user->id,
            'password' => 'sometimes|string|min:8|confirmed',
        ]);

        $data = $request->only(['name', 'email']);
        
        if ($request->has('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $user->update($data);

        return response()->json([
            'message' => 'Profil mis à jour avec succès',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ]
        ]);
    }

    public function refreshToken(Request $request)
    {
        $user = $request->user();
        
        $request->user()->currentAccessToken()->delete();
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Token rafraîchi avec succès',
            'token' => $token,
        ]);
    }
    
 // ========== FONCTIONNALITÉ MOT DE PASSE OUBLIÉ ==========

    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email|exists:users,email'
        ], [
            'email.required' => 'L\'adresse email est requise.',
            'email.email' => 'L\'adresse email doit être valide.',
            'email.exists' => 'Cette adresse email n\'existe pas dans notre système.'
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !$user->actif) {
            return response()->json([
                'message' => 'Si cette adresse email existe, un code de vérification lui a été envoyé.'
            ], 200);
        }

        // Générer un code de vérification de 6 chiffres
        $verificationCode = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        
        // Supprimer les anciens tokens de ce user
        DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->delete();

        // Créer un nouveau token avec le code
        DB::table('password_reset_tokens')->insert([
            'email' => $request->email,
            'token' => Hash::make($verificationCode),
            'verification_code' => $verificationCode,
            'created_at' => now(),
            'expires_at' => now()->addMinutes(15), // 15 minutes d'expiration
        ]);

        // Envoyer l'email avec la classe ResetPasswordMail
        try {
            Mail::to($user->email)->send(new ResetPasswordMail($user, $verificationCode, 15));
        } catch (\Exception $e) {
            \Log::error('Erreur envoi email: ' . $e->getMessage());
            return response()->json([
                'message' => 'Erreur lors de l\'envoi de l\'email. Veuillez réessayer.'
            ], 500);
        }

        return response()->json([
            'message' => 'Un code de vérification a été envoyé à votre adresse email.',
            'email' => $request->email
        ], 200);
    }

    public function verifyResetCode(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'code' => 'required|string|size:6'
        ], [
            'email.required' => 'L\'adresse email est requise.',
            'email.email' => 'L\'adresse email doit être valide.',
            'code.required' => 'Le code de vérification est requis.',
            'code.size' => 'Le code de vérification doit contenir 6 chiffres.'
        ]);

        // Vérifier le code
        $resetRecord = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->where('verification_code', $request->code)
            ->where('expires_at', '>', now())
            ->first();

        if (!$resetRecord) {
            return response()->json([
                'message' => 'Code de vérification invalide ou expiré.'
            ], 400);
        }

        // Générer un token sécurisé pour la réinitialisation
        $resetToken = Str::random(64);

        // Mettre à jour l'enregistrement avec le token de réinitialisation
        DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->update([
                'reset_token' => Hash::make($resetToken),
                'verified_at' => now(),
                'expires_at' => now()->addMinutes(30) // 30 minutes pour réinitialiser
            ]);

        return response()->json([
            'message' => 'Code vérifié avec succès.',
            'reset_token' => $resetToken,
            'email' => $request->email
        ], 200);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'reset_token' => 'required|string',
            'password' => 'required|string|min:8|confirmed'
        ], [
            'email.required' => 'L\'adresse email est requise.',
            'email.email' => 'L\'adresse email doit être valide.',
            'reset_token.required' => 'Le token de réinitialisation est requis.',
            'password.required' => 'Le nouveau mot de passe est requis.',
            'password.min' => 'Le mot de passe doit contenir au moins 8 caractères.',
            'password.confirmed' => 'La confirmation du mot de passe ne correspond pas.'
        ]);

        // Vérifier le token de réinitialisation
        $resetRecord = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->where('expires_at', '>', now())
            ->whereNotNull('verified_at')
            ->first();

        if (!$resetRecord || !Hash::check($request->reset_token, $resetRecord->reset_token)) {
            return response()->json([
                'message' => 'Token de réinitialisation invalide ou expiré.'
            ], 400);
        }

        // Mettre à jour le mot de passe
        $user = User::where('email', $request->email)->first();
        
        if (!$user) {
            return response()->json([
                'message' => 'Utilisateur non trouvé.'
            ], 404);
        }

        $user->update([
            'password' => Hash::make($request->password)
        ]);

        // Supprimer le token utilisé
        DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->delete();

        // Révoquer tous les tokens existants pour sécurité
        $user->tokens()->delete();

        return response()->json([
            'message' => 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.'
        ], 200);
    }

    // Méthode pour vérifier si un token est valide (optionnel)
    public function verifyResetToken(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'reset_token' => 'required|string'
        ]);

        $resetRecord = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->where('expires_at', '>', now())
            ->whereNotNull('verified_at')
            ->first();

        if (!$resetRecord || !Hash::check($request->reset_token, $resetRecord->reset_token)) {
            return response()->json([
                'message' => 'Token invalide ou expiré.',
                'valid' => false
            ], 400);
        }

        return response()->json([
            'message' => 'Token valide.',
            'valid' => true
        ], 200);
    }
}