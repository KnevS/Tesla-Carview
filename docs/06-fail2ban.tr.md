# fail2ban — kaba kuvvet koruması

> 🤖 *Bu Türkçe çeviri [06-fail2ban.en.md](06-fail2ban.en.md) dosyasından yapay zeka destekli oluşturulmuştur. Düzeltmeler GitHub üzerinden memnuniyetle karşılanır.*

> 🇩🇪 [Auf Deutsch lesen](06-fail2ban.md)

Tesla Carview, giriş kimlik bilgilerini tahmin etmeye çalışan veya başka şüpheli aktivite gösteren saldırganları otomatik olarak engellemek için fail2ban kullanır.

## Nasıl çalışır

fail2ban nginx loglarını okur ve eşikler aşıldığında iptables/nftables üzerinden IP'leri yasaklar.

## Kurulum kontrolü

```bash
systemctl status fail2ban
fail2ban-client status
```

## Tesla Carview için önerilen yapılandırma

### `/etc/fail2ban/jail.d/tesla-carview.conf`

```ini
[DEFAULT]
bantime  = 180        # IP'yi 3 dakika yasakla
findtime = 60         # gözlem penceresi: 1 dakika
maxretry = 3          # 3 başarısız deneme → yasak

[nginx-limit-req]
# nginx rate-limit hatalarında tetiklenir (429 yanıtları)
enabled  = true
port     = http,https
filter   = nginx-limit-req
logpath  = /var/log/nginx/error.log
maxretry = 3
findtime = 60
bantime  = 180

[nginx-tesla-login]
# özellikle login endpoint'i için — daha sıkı
enabled  = true
port     = http,https
filter   = nginx-tesla-login
logpath  = /var/log/nginx/access.log
maxretry = 3
findtime = 60
bantime  = 600        # giriş hatalarında 10 dakika
```

### `/etc/fail2ban/filter.d/nginx-tesla-login.conf`

```ini
[Definition]
# login endpoint'indeki 401 yanıtlarıyla eşleşir
failregex = ^<HOST> .* "POST /api/auth/login HTTP/\d" 401
ignoreregex =
```

### `/etc/fail2ban/filter.d/nginx-limit-req.conf`

```ini
[Definition]
# nginx rate-limit aşımları için standart filtre
failregex = ^\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2} \[error\] .+limiting requests, excess:.+by zone.+client: <HOST>
ignoreregex =
```

## Yapılandırmayı etkinleştir

```bash
# yapılandırma dosyalarını oluştur (yukarıdaki gibi)
sudo systemctl reload fail2ban

# durumu kontrol et
sudo fail2ban-client status nginx-tesla-login
sudo fail2ban-client status nginx-limit-req

# bir IP'yi manuel olarak yasaktan çıkar
sudo fail2ban-client set nginx-tesla-login unbanip 1.2.3.4

# fail2ban logunu gerçek zamanlı izle
tail -f /var/log/fail2ban.log
```

## Şiddete göre yasak süreleri

| Senaryo | maxretry | findtime | bantime |
|---|---|---|---|
| Giriş 401 (3 başarısız deneme) | 3 | 60 sn | 600 sn (10 dk) |
| Rate limit aşıldı | 3 | 60 sn | 180 sn (3 dk) |
| SSH kaba kuvvet | 5 | 600 sn | 3600 sn (1 sa) |

## Yasaklamada e-posta bildirimi (opsiyonel)

```ini
# /etc/fail2ban/jail.local içinde
[DEFAULT]
destemail = your@email.com
sender    = fail2ban@your-domain.com
action    = %(action_mwl)s   # yasak + mail + whois sorgusu
```

## Uygulama düzeyinde kilitleme ile etkileşim

Tesla Carview, **uygulama katmanında** 5 başarısız denemeden sonra hesapları kilitler (15 dk).

fail2ban **ağ katmanında** koruma sağlar: IP, istek Node.js sürecine ulaşmadan önce yasaklanır.

| Katman | Mekanizma | Tetikleyici | Süre |
|---|---|---|---|
| Ağ | fail2ban | 60 sn'de 3× HTTP 401 | 10 dk |
| Uygulama | hesap kilitleme | 5× yanlış parola | 15 dk |

İki mekanizma birbirini tamamlar: fail2ban birçok hesap üzerinden kaba kuvvete karşı koruma sağlar, uygulama düzeyindeki kilitleme tek tek hesapları korur.
