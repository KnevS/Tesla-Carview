# Politique de confidentialité

> La présente politique décrit quelles données personnelles sont traitées lors de l'utilisation de cette instance Tesla **auto-hébergée à titre privé**, sur quelle base juridique et dans quel but. Le Règlement général sur la protection des données (RGPD) ainsi que la loi fédérale allemande sur la protection des données (BDSG) s'appliquent.

## 1. Responsable du traitement

Responsable du traitement au sens de l'art. 4 (7) RGPD :

<<NAME>>
<<STREET>>
<<ZIP_CITY>>
<<COUNTRY>>
Courriel : <<EMAIL>>

## 2. Nature du traitement

L'application est exploitée **exclusivement pour l'usage privé** du responsable du traitement et de son foyer. **Aucun** traitement de données de tiers n'a lieu ; l'inscription publique n'est pas possible.

Toutes les données restent **localement sur le serveur du responsable du traitement**. **Aucun** transfert vers des tiers n'a lieu — à l'exception de deux cas documentés (Tesla, Monta en option), voir section 5.

## 3. Données traitées

| Catégorie de données | Finalité | Base juridique |
|---|---|---|
| Nom d'utilisateur, hachage du mot de passe, secret MFA, historique des connexions | Authentification et protection du compte | Art. 6 (1) (b) RGPD — exécution d'un contrat |
| Jeton OAuth du compte Tesla | Accès à la Tesla Fleet API pour les véhicules de l'utilisateur | Art. 6 (1) (b) RGPD |
| Données de base du véhicule (VIN, modèle, année) | Gestion du véhicule | Art. 6 (1) (b) RGPD |
| Données de trajets (GPS, vitesse, consommation) | Carnet de bord, analyse d'autonomie et de consommation | Art. 6 (1) (a/b) RGPD |
| Sessions de recharge (énergie, durée, coût, GPS) | Historique de recharge, relevé des coûts de recharge à domicile | Art. 6 (1) (b) RGPD |
| Télémétrie de la batterie (SoC, température, tension) | Analyse de dégradation | Art. 6 (1) (b) RGPD |
| Journaux serveur (IP, user agent, horodatages, codes de statut) | Sécurité, prévention des abus (fail2ban, limitation de débit) | Art. 6 (1) (f) RGPD — intérêt légitime |
| Journal d'audit des actions liées à la sécurité | Investigation en cas d'incident | Art. 6 (1) (f) RGPD |

## 4. Conservation

| Catégorie de données | Conservation |
|---|---|
| Jetons de rafraîchissement | 7 jours glissants, puis suppression automatique |
| Journaux serveur (nginx) | 14 jours avec rotation |
| Données de trajets et de recharge | indéfinie — fonction de suppression / nettoyage disponible dans l'application |
| Compte utilisateur | jusqu'à suppression active |

Le responsable du traitement peut supprimer les données à tout moment via la fonction **« Gestion des données »** dans l'application.

## 5. Destinataires / transfert vers un pays tiers

### 5.1 Tesla, Inc. (États-Unis)

Pour interroger les données du véhicule et le commander, la [Tesla Fleet API](https://developer.tesla.com) est utilisée. Les appels API (y compris jeton OAuth, VIN du véhicule, paramètres de commandes) sont transmis à Tesla, Inc. (3500 Deer Creek Road, Palo Alto, CA 94304, USA). Il n'existe pas de relation de sous-traitance au sens de l'art. 28 RGPD ; Tesla agit en tant que responsable du traitement indépendant. Mécanisme de transfert : **Clauses contractuelles types** de la Commission européenne et **EU-US Data Privacy Framework**. Politique de confidentialité Tesla : [https://www.tesla.com/legal/privacy](https://www.tesla.com/legal/privacy).

### 5.2 Monta ApS (Danemark) — optionnel

Si l'intégration Monta est activée dans les paramètres, les sessions de recharge sont synchronisées avec la Monta Partner API à des fins de facturation. Destinataire : Monta ApS, Vesterbrogade 26, 1620 Copenhague, Danemark. Traitement dans l'EEE — pas de transfert vers un pays tiers. Confidentialité : [https://monta.com/privacy](https://monta.com/privacy).

## 6. Cookies

L'application utilise **uniquement des cookies strictement nécessaires** :

- `refreshToken` (httpOnly, Secure, SameSite=Strict) — session de connexion, validité de 7 jours
- `localStorage['locale']` — langue choisie, stockée localement dans le navigateur uniquement, jamais transmise

**Aucun** cookie de suivi, publicitaire ou d'analyse n'est utilisé. Le consentement au titre du § 25 TDDDG n'est donc pas requis.

## 7. Hébergement

Le serveur hébergeant cette instance est exploité par le responsable du traitement lui-même (auto-hébergement) ou auprès d'un hébergeur lié par un contrat de sous-traitance. L'hébergeur concret sera communiqué sur demande.

## 8. Vos droits en tant que personne concernée

Vous disposez notamment des droits suivants au titre des art. 15 à 22 RGPD :

- **Droit d'accès** aux données vous concernant (art. 15)
- **Droit de rectification** des données inexactes (art. 16)
- **Droit à l'effacement** (« droit à l'oubli », art. 17) — dans la mesure permise par la loi
- **Droit à la limitation** du traitement (art. 18)
- **Droit à la portabilité** dans un format structuré et lisible par machine (art. 20) — l'application propose un export CSV/JSON
- **Droit d'opposition** au traitement fondé sur l'intérêt légitime (art. 21)
- **Droit d'introduire une réclamation** auprès d'une autorité de contrôle (art. 77) — l'autorité de protection des données de votre Land allemand est compétente

Adressez vos demandes par courriel à <<EMAIL>>.

## 9. Sécurité

L'application met en œuvre des mesures techniques et organisationnelles conformément à l'art. 32 RGPD. Détails : voir la [politique de sécurité](https://github.com/KnevS/Tesla-Carview/blob/main/SECURITY.en.md) dans le dépôt.

## 10. Modifications de la présente politique

La présente politique peut être modifiée en cas d'évolution du traitement ou du cadre juridique. Après chaque modification, il vous sera demandé de la confirmer à nouveau lors de votre prochaine connexion. Les versions antérieures sont conservées dans le système à titre de preuve.

Dernière mise à jour : <<DATE>>
