<?php
// app/Mail/ResetPasswordMail.php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ResetPasswordMail extends Mailable
{
    use Queueable, SerializesModels;

    public $user;
    public $verificationCode;
    public $expiresIn;

    /**
     * Create a new message instance.
     */
    public function __construct(User $user, string $verificationCode, int $expiresIn = 15)
    {
        $this->user = $user;
        $this->verificationCode = $verificationCode;
        $this->expiresIn = $expiresIn;
    }

    /**
     * Build the message.
     */
    public function build()
    {
        return $this->subject('Code de vérification - Réinitialisation mot de passe')
                    ->view('emails.verification-code')
                    ->with([
                        'user' => $this->user,
                        'verificationCode' => $this->verificationCode,
                        'expiresIn' => $this->expiresIn
                    ]);
    }
}