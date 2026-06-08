# Raspberry Pi: Вибір правильного сховища — більше ніяких смертей SD-карти

> 🤖 *Цей український переклад створений з AI-підтримкою з [README.en.md](README.en.md). Виправлення приймаються на GitHub.*

> 🇩🇪 [Auf Deutsch lesen](15-raspberry-pi-storage.md) · 🇬🇧 [Read in English](15-raspberry-pi-storage.en.md)

SD-карти та робота 24/7 — погана комбінація. Цей розділ пояснює **чому**, яка альтернатива найкраще пасує вашому setup і як запустити її за 20 хвилин.

---

## Проблема: чому SD-карти не підходять для серверів

Сучасні SD-карти зазвичай витримують **3 000–10 000 циклів запису на блок сховища** — старіші карти ще менше. Це звучить як багато. Але це не так.

| Що пише на SD-карту? | Частота |
|---|---|
| Журнали Docker-контейнерів | Кілька разів на хвилину |
| База даних SQLite (поїздки, сесії зарядки) | Кожен цикл polling (кожні 30–60 с) |
| Системні журнали (`/var/log`) | Постійно |
| Swap-файл OS | Під тиском пам'яті |

**Реалістичний результат:** Типова SD-карта під навантаженням запису Tesla Carview витримує **3–18 місяців**, після чого:
- Пошкодження файлової системи → система не вантажиться
- Дані втрачені (резервні копії допомагають, але шкода вже завдана)
- Найгірший сценарій: тихе, невиявлене пошкодження даних

> **Висновок: SD-карта годиться для швидких експериментів. Для постійної роботи завжди замінюйте.**

---

## Який варіант для мене?

```
Який Raspberry Pi у вас?
│
├── Raspberry Pi 5
│     ├── Хочете максимальну продуктивність і довговічність?
│     │     → Варіант B: NVMe SSD через M.2 HAT+ ⭐ (рекомендовано)
│     └── Просто і дешево, без збирання?
│           → Варіант A: USB SSD (відмінно і на Pi 5)
│
├── Raspberry Pi 4
│     ├── Homelab з Gigabit-мережею + наявний сервер?
│     │     → Варіант C: PXE мережеве завантаження (локальне сховище не потрібне)
│     └── Звичайна домашня мережа, без додаткового сервера?
│           → Варіант A: USB SSD (найпростіше рішення)
│
└── Raspberry Pi 3 або старіший
      → Варіант A: USB SSD (USB 2.0, повільніше за Pi 4/5)
        або: Купіть новіший Pi — Pi 4/5 — краща інвестиція
```

---

## Варіант A: USB SSD (найпростіше рішення для всіх моделей Pi)

**Що потрібно:**
- Портативний SSD **або** 2,5″ SSD + USB-адаптер
- Це все

**Рекомендоване обладнання (2025):**

| Продукт | Приблизна ціна | Примітки |
|---|---|---|
| Samsung T7 (500 GB) | ~€55 | Чудовий, але Pi 4 потребує quirk-workaround (→ нижче) |
| Crucial X6 (500 GB) | ~€45 | Надійний, без quirks |
| WD My Passport SSD (500 GB) | ~€50 | Добре протестований під Raspberry Pi OS |
| 2,5″ SATA SSD + UGREEN USB 3.0 адаптер | ~€35–50 | Дуже надійно, рекомендовано для Pi 4 |

> **Уникайте дешевих адаптерів:** Деякі no-name USB-SATA адаптери мають проблеми з UASP (USB Attached SCSI Protocol) на Pi 4. Брендові адаптери (UGREEN, Inateck) надійніші.

### Крок 1: Записати OS на SSD

1. Завантажте **Raspberry Pi Imager**: [https://www.raspberrypi.com/software/](https://www.raspberrypi.com/software/)
2. Підключіть SSD через USB до звичайного комп'ютера
3. Відкрийте Imager:
   - **Device:** виберіть Raspberry Pi 4 або 5
   - **OS:** Raspberry Pi OS Lite (64-bit) — без desktop, заощаджує ресурси
   - **Storage:** ваш SSD
4. Натисніть значок шестерні (⚙️) → попередньо налаштуйте:
   - Встановіть hostname (наприклад, `tesla-pi`)
   - Увімкніть SSH
   - Введіть облікові дані Wi-Fi (якщо не використовуєте Ethernet)
   - Встановіть username + пароль
5. **Write** — готово приблизно за 5 хвилин

### Крок 2: Оновлення bootloader на Pi 4 (лише Pi 4, одноразово)

Pi 4 потрібно один раз налаштувати для завантаження з USB. **Pi 5 робить це з коробки — пропустіть цей крок.**

```bash
# Або: завантажтесь коротко зі звичайної SD-карти, потім:
sudo raspi-config
# → Advanced Options → Boot Order → USB Boot → Finish → Reboot

# Або напряму через EEPROM:
sudo rpi-eeprom-update -a
sudo reboot
```

Потім: вийміть SD-карту, підключіть SSD, увімкніть Pi → завантажується з SSD.

### Крок 3: Quirk Samsung T7 на Pi 4 (якщо потрібно)

Якщо Pi 4 не завантажується з Samsung T7 (зависає на червоному екрані з блискавкою):

```bash
# Відкрити /boot/firmware/cmdline.txt (має залишитися одним рядком!):
sudo nano /boot/firmware/cmdline.txt

# Додати в кінець рядка (з пробілом перед):
usb-storage.quirks=04e8:4001:u

# Зберегти, перезавантажити:
sudo reboot
```

Це вимикає UASP для T7 — продуктивність все одно у 5–10× краща за SD-карту.

### Крок 4: Встановити Tesla Carview

Звідси діємо як описано в [02-deployment.en.md](02-deployment.en.md):

```bash
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

---

## Варіант B: NVMe SSD на Raspberry Pi 5 (найкраща продуктивність)

Pi 5 має **PCIe-роз'єм** — з офіційним M.2 HAT+ або стороннім адаптером ви отримуєте швидкості NVMe **400–900 MB/с** (для порівняння: SD-карта 20–90 MB/с).

**Що потрібно:**

| Компонент | Рекомендація | Приблизна ціна |
|---|---|---|
| Raspberry Pi 5 (4 GB або 8 GB RAM) | — | від €60 |
| Офіційний **Raspberry Pi M.2 HAT+** | форм-фактор 2230 або 2242 | ~€15 |
| **або** Pimoroni NVMe BASE | Компактний, без spacers | ~€20 |
| **або** Pineberry HatDrive Bottom | Монтується під Pi | ~€25 |
| NVMe SSD M.2 2230 або 2242 | WD Green SN350, Kingston NV2, Samsung PM991 | €25–60 |

> **Перевірте форм-фактор:** M.2 HAT+ підтримує лише **2230** і **2242** (короткі/середні SSD). Стандартні 2280 SSD (довгі) не пасують в офіційний HAT+ — але деякі сторонні HAT їх підтримують.

### Крок 1: Зібрати обладнання

1. Вставте SSD у слот M.2 під кутом, потім притисніть плоско
2. Закріпіть гвинтом з комплекту
3. Підключіть плаский FFC-шлейф (HAT → роз'єм PCIe Pi 5)
4. Встановіть HAT на GPIO-роз'єм Pi 5

### Крок 2: Записати OS на NVMe SSD

**Варіант A (просто):** Записати з працюючого Pi OS прямо на NVMe:

```bash
# Запустіть Pi з SD-карти, потім:
sudo apt update && sudo apt install rpi-imager -y
rpi-imager
# → Виберіть NVMe SSD як ціль → записати
```

**Варіант B:** Записати на SSD за допомогою USB-NVMe адаптера на звичайному комп'ютері (так само як Варіант A).

### Крок 3: Встановити порядок завантаження

```bash
sudo raspi-config
# → Advanced Options → Boot Order → NVMe/USB Boot
# → Finish → Reboot
```

Вийміть SD-карту, перезапустіть Pi → завантажується з NVMe.

### Крок 4: Оптимізувати швидкість PCIe (опціонально)

Pi 5 за замовчуванням працює PCIe в Gen 2 (~400 MB/с). Gen 3 (~900 MB/с) можливий, але офіційно не підтримується:

```bash
# /boot/firmware/config.txt:
sudo nano /boot/firmware/config.txt

# Для Gen 3 (на власний ризик, зазвичай стабільно):
dtparam=pciex1_gen=3
```

---

## Варіант C: PXE мережеве завантаження (для homelab-ентузіастів)

**Що це?** Pi взагалі не має локального сховища. Він завантажується **повністю через мережу** з центрального сервера. Ідеально, коли:
- Ви керуєте кількома Pi
- NAS (Synology, TrueNAS) або mini PC вже доступні як сервер
- Ви надаєте перевагу централізованим резервним копіям і оновленням

**Вимоги:**
- Gigabit Ethernet (без Wi-Fi — занадто повільно і ненадійно для PXE)
- Сервер у мережі, який може надавати DHCP + TFTP (NAS, старий PC, Pi 4)
- Raspberry Pi 4 або 5 (Pi 3 працює з додатковими зусиллями)

### Швидке налаштування: PXE-сервер з dnsmasq

На сервері (Debian/Ubuntu або NAS):

```bash
# Встановити dnsmasq
sudo apt install dnsmasq -y

# Створити директорію TFTP
sudo mkdir -p /srv/tftp/rpi

# Налаштувати NFS root-файлову систему для Pi:
sudo apt install nfs-kernel-server -y
sudo mkdir -p /srv/nfs/rpi

# /etc/exports:
echo "/srv/nfs/rpi *(rw,sync,no_subtree_check,no_root_squash)" | sudo tee -a /etc/exports
sudo exportfs -ra
```

**/etc/dnsmasq.conf** (proxy DHCP-режим — працює поруч з наявним роутером):

```ini
port=0
dhcp-range=192.168.1.0,proxy
log-dhcp
enable-tftp
tftp-root=/srv/tftp
pxe-service=0,"Raspberry Pi Boot"
```

Повне налаштування (копія rootfs, конфігурація NFS, конфігурація з боку Pi) обширне — дивіться офіційну документацію PXE Raspberry Pi:
[https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi](https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi)

**Коли PXE справді того варте?** Коли ви вже запускаєте homelab з централізованим сховищем. Для одного Pi USB SSD або NVMe простіше і так само добре.

---

## Міграція з SD-карти на SSD (існуюча інсталяція)

Уже запускаєте Tesla Carview на SD-карті і хочете переїхати на SSD? Без проблем — без втрати даних:

### Крок 1: Клонувати SD-карту на SSD

```bash
# Підключіть SSD через USB до працюючого Pi
# Визначте цільовий диск:
lsblk
# → SSD зазвичай з'являється як /dev/sda

# Клонувати SD-карту на SSD (Pi може залишатися запущеним):
sudo dd if=/dev/mmcblk0 of=/dev/sda bs=4M status=progress conv=fsync

# Змінити розмір розділу на SSD, щоб використати весь доступний простір:
sudo parted /dev/sda resizepart 2 100%
sudo resize2fs /dev/sda2
```

### Крок 2: Завантаження з SSD

Оновіть bootloader, як описано вище (Варіант A, Крок 2), потім вийміть SD-карту — SSD залишається підключеним.

### Крок 3: Перевірити

```bash
# Перевірте, що ми завантажилися з SSD:
findmnt /
# → має показати /dev/sda2 або nvme0n1p2, НЕ mmcblk0p2
```

---

## Швидке порівняння всіх варіантів

| | SD-карта | USB SSD | NVMe (Pi 5) | PXE |
|---|---|---|---|---|
| **Довговічність** | ❌ Місяці | ✅ Роки | ✅ Роки | ✅ Без локального зносу |
| **Зусилля на налаштування** | ✅ Мінімальне | ✅ Низьке | 🟡 Середнє (зібрати HAT) | ❌ Високе |
| **Вартість** | ✅ ~€10 | 🟡 ~€35–60 | 🟡 ~€50–100 | ✅ €0 (якщо сервер є) |
| **Швидкість читання** | 20–90 MB/с | 200–500 MB/с | 400–900 MB/с | Швидкість LAN |
| **Рекомендовано для** | Тестування | Постійне використання Pi 4 | Постійне використання Pi 5 | Homelab |

---

## Часті питання

### "Чи треба виймати SD-карту, чи можна залишити?"

На Pi 4: Після оновлення bootloader SD-карту можна вийняти. Pi тоді завжди завантажується з USB. Якщо залишити її і вона порожня або не bootable, він все одно завантажується з USB.

На Pi 5: SD-карта може залишатися вставленою — після конфігурації Pi все одно надає перевагу NVMe/USB.

### "Якого розміру має бути SSD?"

**60–120 GB** цілком достатньо для Tesla Carview. База SQLite зростає до кількох сотень MB за роки. Купівля більшого розміру коштує ледь дорожче і дає контролеру SSD більше місця для wear leveling → довший термін служби.

### "Що з відключеннями живлення — чи втрачаю я дані?"

SSD та NVMe SSD стійкіші за SD-карти при відключеннях живлення, але не імунні. Для важливих даних: **регулярні резервні копії** через адмін-інтерфейс Tesla Carview (`Admin → Data → Backup`) або увімкніть автоматичні нічні резервні копії.

### "Чи можна використовувати USB-флешку замість SSD?"

Технічно так, але **не рекомендовано**. USB-флешки зазвичай не мають алгоритмів wear leveling — вони вмирають ще швидше за SD-карти. Різниця в ціні до дешевого SSD мінімальна.

---

## Корисні посилання

- [Завантаження Raspberry Pi Imager](https://www.raspberrypi.com/software/)
- [raspberry.tips: Завантаження Pi 4 з USB SSD (EN)](https://raspberry.tips/en/raspberrypi-tutorials/boot-raspberry-pi-from-usb-ssd-flash-drive-pi-4-5)
- [raspberry.tips: Налаштування Pi 5 NVMe + benchmarks (EN)](https://raspberry.tips/en/raspberrypi-tutorials/raspberry-pi-5-nvme-ssd-boot)
- [Офіційна документація Pi M.2 HAT+](https://www.raspberrypi.com/documentation/accessories/m2-hat-plus.html)
- [Документація PXE-завантаження Raspberry Pi](https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi)
- [Калькулятор терміну служби SD-карти](https://raspberry.tips/en/calculate-raspberry-pi-sd-card-lifespan-test-now)

---

*→ Назад до [02-deployment.en.md](02-deployment.en.md) | [Доступ до мережі](14-network-access.en.md) | [Вся документація](README.en.md)*
