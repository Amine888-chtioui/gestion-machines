<?php
// resources/views/emails/verification-code.blade.php
// Template pour l'email avec code de vérification

?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Code de vérification</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8f9fa;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            padding: 40px 30px;
        }
        .verification-code {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-size: 32px;
            font-weight: bold;
            text-align: center;
            padding: 20px;
            border-radius: 10px;
            letter-spacing: 8px;
            margin: 30px 0;
            font-family: 'Courier New', monospace;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            font-size: 14px;
            color: #6c757d;
        }
        .security-notice {
            background: #fff3cd;
            border: 1px solid #ffeeba;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
        }
        .expiry-notice {
            background: #d1ecf1;
            border: 1px solid #bee5eb;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
            color: #0c5460;
        }
        .steps {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .step {
            margin: 10px 0;
            padding: 5px 0;
        }
        .step-number {
            display: inline-block;
            background: #667eea;
            color: white;
            width: 25px;
            height: 25px;
            border-radius: 50%;
            text-align: center;
            line-height: 25px;
            font-size: 12px;
            font-weight: bold;
            margin-right: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Code de vérification</h1>
            <p>Réinitialisation de mot de passe</p>
        </div>
        
        <div class="content">
            <h2>Bonjour {{ $user->name }},</h2>
            
            <p>Vous avez demandé la réinitialisation de votre mot de passe. Voici votre code de vérification :</p>
            
            <div class="verification-code">
                {{ $verificationCode }}
            </div>
            
            <div class="expiry-notice">
                <strong>⏰ Important :</strong> Ce code est valide pendant {{ $expiresIn }} minutes seulement.
            </div>

            <div class="steps">
                <h3>Étapes suivantes :</h3>
                <div class="step">
                    <span class="step-number">1</span>
                    Copiez le code de vérification ci-dessus
                </div>
                <div class="step">
                    <span class="step-number">2</span>
                    Collez-le dans la page de vérification
                </div>
                <div class="step">
                    <span class="step-number">3</span>
                    Créez votre nouveau mot de passe
                </div>
            </div>
            
            <div class="security-notice">
                <strong>🛡️ Sécurité :</strong> Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email et contactez notre support. Votre mot de passe actuel reste inchangé.
            </div>
            
            <p><strong>Conseils de sécurité :</strong></p>
            <ul>
                <li>Ne partagez jamais ce code avec personne</li>
                <li>Utilisez un mot de passe fort avec au moins 8 caractères</li>
                <li>Incluez des majuscules, minuscules, chiffres et symboles</li>
            </ul>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
            
            <p>Cordialement,<br>
            <strong>L'équipe du système de gestion</strong></p>
        </div>
        
        <div class="footer">
            <p>© {{ date('Y') }} Système de gestion des machines et composants</p>
            <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
        </div>
    </div>
</body>
</html>