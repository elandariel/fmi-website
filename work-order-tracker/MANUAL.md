# 📘 Manual Guide — NOC FMI Web Application

> Versi Dokumen: 1.0 | Terakhir diperbarui: April 2026  
> Sistem ini digunakan oleh tim NOC Fibermedia untuk manajemen tiket gangguan backbone, work order, VLAN, dan data client.

---

## Daftar Isi

1. [Pengenalan Sistem](#1-pengenalan-sistem)
2. [Login & Akses](#2-login--akses)
3. [Navigasi Sidebar](#3-navigasi-sidebar)
4. [Role & Hak Akses](#4-role--hak-akses)
5. [Dashboard](#5-dashboard)
6. [Backbone Report NOC](#6-backbone-report-noc)
   - [Melihat Daftar Tiket](#61-melihat-daftar-tiket)
   - [Membuat Tiket Baru](#62-membuat-tiket-baru)
   - [Update Status Tiket](#63-update-status-tiket)
   - [Timeline ON PROGRESS](#64-timeline-on-progress)
   - [WA Report](#65-wa-report)
   - [PDF Report](#66-pdf-report)
   - [Kode Backbone (Index NOC)](#67-kode-backbone-index-noc)
   - [Sistem Approval Kode Backbone](#68-sistem-approval-kode-backbone)
7. [VLAN Database](#7-vlan-database)
8. [Data Client](#8-data-client)
9. [Data Interkoneksi](#9-data-interkoneksi)
10. [Monthly Report Aktivator](#10-monthly-report-aktivator)
11. [Weekly Report Aktivator](#11-weekly-report-aktivator)
12. [Activity Log](#12-activity-log)
13. [Tools & Utilities](#13-tools--utilities)
14. [Work Orders](#14-work-orders)
15. [Tracker](#15-tracker)
16. [Broadcast](#16-broadcast)
17. [Profil & Pengaturan Akun](#17-profil--pengaturan-akun)
18. [Manage Users (Admin)](#18-manage-users-admin)
19. [Integrasi Telegram](#19-integrasi-telegram)
20. [Integrasi Odoo Helpdesk](#20-integrasi-odoo-helpdesk)

---

## 1. Pengenalan Sistem

**NOC FMI Web** adalah platform internal Fibermedia yang dirancang khusus untuk tim **Network Operations Center (NOC)**. Sistem ini mengintegrasikan berbagai kebutuhan operasional dalam satu tampilan, mulai dari pencatatan gangguan backbone hingga pembuatan laporan otomatis.

### Fitur Utama

| Fitur | Keterangan |
|---|---|
| Backbone Report NOC | Manajemen tiket gangguan jaringan backbone |
| WA Report | Generate laporan otomatis siap kirim ke WhatsApp |
| PDF Report | Laporan bulanan/kuartalan/tahunan dalam format PDF |
| Approval Kode Backbone | Sistem persetujuan penambahan kode backbone via Telegram |
| VLAN Database | Manajemen database VLAN |
| Data Client | Database client korporat |
| Work Orders | Pengelolaan work order |
| Integrasi Odoo | Sinkronisasi tiket dengan Odoo Helpdesk |
| Integrasi Telegram | Notifikasi log dan sistem approval via bot Telegram |

---

## 2. Login & Akses

### Cara Login

1. Buka browser dan akses URL aplikasi
2. Masukkan **Email** dan **Password** yang telah didaftarkan
3. Klik tombol **Login**

> ⚠️ Akun harus didaftarkan terlebih dahulu oleh **Admin** atau **SUPER_DEV**. Tidak ada fitur registrasi mandiri.

### Lupa Password

1. Klik **"Lupa Password?"** di halaman login
2. Masukkan email yang terdaftar
3. Cek email untuk link reset password
4. Klik link dan buat password baru

### Keamanan Akun

- Gunakan password minimal **6 karakter** dengan kombinasi huruf besar, kecil, dan angka
- Jangan bagikan password ke orang lain
- Logout setelah selesai menggunakan sistem

---

## 3. Navigasi Sidebar

Sidebar berada di sisi kiri layar dan menampilkan menu sesuai hak akses role kamu.

```
NOC FMI
├── REPORTING
│   ├── Dashboard
│   ├── Monthly Report Aktivator
│   ├── Weekly Report Aktivator
│   └── Backbone Report NOC
│
├── DATABASE
│   ├── VLAN Database
│   ├── Data Client
│   └── Data Interkoneksi
│
├── LOG & TOOLS
│   ├── Activity Log
│   └── Tools & Utilities
│
└── ACCESS
    ├── Manage Users    (Admin/SUPER_DEV)
    └── Broadcast       (Admin/SUPER_DEV)
```

> Menu yang tidak sesuai dengan role kamu tidak akan ditampilkan.

---

## 4. Role & Hak Akses

Sistem menggunakan 4 role utama dengan hak akses berbeda:

| Role | Deskripsi |
|---|---|
| **SUPER_DEV** | Akses penuh ke semua fitur termasuk pengaturan sistem |
| **ADMIN** | Akses manajemen user dan semua fitur operasional |
| **NOC** | Akses fitur backbone, tiket, dan laporan |
| **AKTIVATOR** | Akses work order dan laporan aktivasi |

### Tabel Hak Akses Detail

| Fitur | SUPER_DEV | ADMIN | NOC | AKTIVATOR |
|---|:---:|:---:|:---:|:---:|
| Backbone Report NOC | ✅ | ✅ | ✅ | ❌ |
| Buat Tiket | ✅ | ✅ | ✅ | ❌ |
| Approve Kode Backbone | ✅ | ✅ | ❌ | ❌ |
| VLAN Database | ✅ | ✅ | ✅ | ❌ |
| Data Client | ✅ | ✅ | ✅ | ✅ |
| Work Orders | ✅ | ✅ | ❌ | ✅ |
| Manage Users | ✅ | ✅ | ❌ | ❌ |
| Broadcast | ✅ | ✅ | ❌ | ❌ |
| Activity Log | ✅ | ✅ | ✅ | ✅ |

> Admin dapat memberikan **override permission** untuk user tertentu melebihi batas role default-nya.

---

## 5. Dashboard

Halaman utama yang menampilkan ringkasan kondisi jaringan dan aktivitas terkini.

### Isi Dashboard

- **Tiket Aktif** — Jumlah tiket backbone yang sedang berjalan (ON PROGRESS / PENDING)
- **Statistik Harian** — Ringkasan tiket hari ini
- **Status Jaringan** — Overview kondisi backbone

---

## 6. Backbone Report NOC

Fitur utama untuk tim NOC dalam mengelola gangguan jaringan backbone.

### 6.1 Melihat Daftar Tiket

- Buka menu **Backbone Report NOC** di sidebar
- Daftar tiket ditampilkan dalam tampilan tabel
- Gunakan **filter** di bagian atas untuk menyaring berdasarkan:
  - Status (OPEN, ON PROGRESS, PENDING, SOLVED, UNSOLVED, CANCEL)
  - Periode tanggal
  - Kode backbone / nama link

### Status Tiket

| Status | Warna | Keterangan |
|---|---|---|
| OPEN | 🔴 Merah | Tiket baru dibuka, belum ada penanganan |
| ON PROGRESS | 🟡 Kuning | Tim sedang menangani |
| PENDING | 🟠 Oranye | Menunggu pihak lain / material |
| SOLVED | 🟢 Hijau | Gangguan telah teratasi |
| UNSOLVED | ⚫ Abu | Tidak dapat diselesaikan |
| CANCEL | ⬜ Putih | Tiket dibatalkan |

### 6.2 Membuat Tiket Baru

1. Klik tombol **"+ Tiket Baru"** di pojok kanan atas
2. Isi form dengan data berikut:

| Field | Keterangan |
|---|---|
| Nomor Tiket | Nomor tiket (contoh: HT12345) |
| Subject Ticket | Judul/deskripsi singkat gangguan |
| Tanggal Report | Tanggal kejadian |
| Priority | MAJOR / CRITICAL / MINOR |
| Kode Backbone | Pilih dari daftar Index NOC |
| Nama Link | Nama link yang terdampak |
| Kapasitas | Kapasitas link (contoh: 10G) |
| Problem | Jenis problem (DOWN, DEGRADED, dll) |
| Start Down | Waktu mulai gangguan |

3. Klik **"Simpan"**

> Tiket yang dibuat akan otomatis tersinkronisasi ke **Odoo Helpdesk** jika integrasi sudah dikonfigurasi.

### 6.3 Update Status Tiket

1. Klik ikon **edit** atau baris tiket yang ingin diupdate
2. Pilih status baru:
   - **ON PROGRESS** — Masukkan update timeline
   - **PENDING** — Masukkan keterangan pending
   - **SOLVED** — Isi waktu selesai dan detail penyelesaian
   - **UNSOLVED / CANCEL** — Isi alasan

3. Klik **"Simpan"**

### 6.4 Timeline ON PROGRESS

Setiap update ke status **ON PROGRESS** atau **PENDING** akan **menambahkan entri baru** ke timeline, bukan menimpa yang lama.

**Contoh tampilan timeline:**
```
> Team dalam perjalanan ke lokasi
> Team tiba di lokasi, mulai pengecekan
> Ditemukan kabel putus di titik koordinat X
> Proses penyambungan kabel selesai
```

Seluruh riwayat update tersimpan dan tampil di **WA Report**.

### 6.5 WA Report

Generate laporan siap kirim ke WhatsApp Group dengan satu klik.

**Cara menggunakan:**

1. Klik tombol **"WA Report"** di toolbar atas
2. Modal akan menampilkan preview laporan semua tiket **aktif** hari ini
3. Klik **"Copy Report"** untuk menyalin ke clipboard
4. Paste ke WhatsApp Group

**Format WA Report:**
```
*REPORT BACKBONE PROBLEM | Rabu, 29 April 2026*

===================================
1. HT12345 - MAJOR - BACKBONE - MR <> SAMALI V DIRECT 10G - DOWN [Selasa 29 April 2026]

Problem    : DOWN
Impact     :
- SAMALI <> APJII V BUNCIT (10G)
Status     : ON PROGRESS

> Team dalam perjalanan ke lokasi
> Team tiba di lokasi, mulai pengecekan
```

> Laporan hanya menampilkan tiket dengan status **aktif** (OPEN, ON PROGRESS, PENDING).

### 6.6 PDF Report

Generate laporan rekap dalam format PDF untuk periode tertentu.

**Cara menggunakan:**

1. Klik tombol **"PDF"** di toolbar atas
2. Pilih tipe laporan:
   - **Bulanan** — Pilih bulan dan tahun
   - **Kuartalan** — Pilih kuartal dan tahun
   - **Tahunan** — Pilih tahun
3. Klik **"Generate PDF"**

**Isi PDF Report:**
- Rekap jumlah tiket per status
- Statistik SLA dan MTTR
- Breakdown per jenis problem
- Breakdown per kode backbone
- Tabel detail semua tiket dalam periode

> Item dengan jumlah 0 tetap ditampilkan (dengan tampilan redup) sebagai referensi kelengkapan data.

### 6.7 Kode Backbone (Index NOC)

Daftar kode backbone yang terdaftar di sistem. Digunakan sebagai referensi saat membuat tiket.

**Cara melihat Index NOC:**
- Klik tombol **"Index NOC"** atau ikon daftar di toolbar

**Menambah Kode Backbone:**
- Role **SUPER_DEV / ADMIN** → langsung masuk ke Index NOC
- Role **NOC** → masuk ke antrian approval (lihat bagian berikutnya)

### 6.8 Sistem Approval Kode Backbone

Untuk menjaga kualitas data, penambahan kode backbone oleh role NOC **harus disetujui** oleh Admin/SUPER_DEV terlebih dahulu.

**Alur Approval:**

```
NOC request kode baru
        ↓
Masuk ke backbone_pending
        ↓
Bot Telegram kirim notifikasi ke semua Admin
        ↓
Admin klik [✅ Setujui] atau [❌ Tolak] di Telegram
        ↓
Jika disetujui → kode masuk ke Index NOC
Jika ditolak  → request dihapus
```

**Untuk NOC:**
1. Klik tombol **"+ Kode Backbone"**
2. Isi Kode dan Nama Backbone
3. Klik **"Request"**
4. Notifikasi otomatis terkirim ke Admin via Telegram
5. Tunggu persetujuan — kode akan muncul di Index NOC setelah disetujui

**Untuk Admin (melalui web):**
- Klik badge **"⏳ Acc Kode"** yang muncul di toolbar saat ada request pending
- Klik **Setujui** atau **Tolak** untuk setiap request

**Untuk Admin (melalui Telegram):**
- Bot akan mengirim DM berisi detail request
- Klik **✅ Setujui** atau **❌ Tolak** langsung dari chat Telegram

---

## 7. VLAN Database

Database untuk manajemen VLAN jaringan Fibermedia.

### Fitur

- Lihat daftar VLAN berdasarkan range (1-1000, 1000+, 2000+, 3000+, 3500+, 4003+)
- Cari VLAN berdasarkan nomor atau nama
- Tambah, edit, hapus entri VLAN

### Cara Penggunaan

1. Buka menu **VLAN Database**
2. Pilih tab range VLAN yang diinginkan
3. Gunakan kolom pencarian untuk filter data
4. Klik **"Tambah"** untuk menambah VLAN baru

---

## 8. Data Client

Database informasi client korporat Fibermedia.

### Fitur

- Lihat profil lengkap client
- Cari berdasarkan nama, alamat, atau nomor kontrak
- Export data client

### Cara Penggunaan

1. Buka menu **Data Client**
2. Gunakan search bar untuk mencari client
3. Klik nama client untuk melihat detail
4. Klik **"Edit"** untuk memperbarui informasi

---

## 9. Data Interkoneksi

Database data interkoneksi jaringan antar node/provider.

### Cara Penggunaan

1. Buka menu **Data Interkoneksi**
2. Lihat daftar interkoneksi yang tersedia
3. Gunakan filter untuk menyaring data

---

## 10. Monthly Report Aktivator

Laporan bulanan untuk tim Aktivator berisi rekap pekerjaan aktivasi layanan.

### Cara Penggunaan

1. Buka menu **Monthly Report Aktivator**
2. Pilih **bulan** dan **tahun** laporan
3. Data akan otomatis terfilter sesuai periode
4. Export ke PDF atau cetak jika diperlukan

---

## 11. Weekly Report Aktivator

Laporan mingguan aktivitas tim Aktivator.

### Cara Penggunaan

1. Buka menu **Weekly Report Aktivator**
2. Pilih minggu yang ingin dilihat
3. Review data aktivasi dalam periode tersebut

---

## 12. Activity Log

Catatan semua aktivitas yang terjadi di sistem, berguna untuk audit dan monitoring.

### Informasi yang Tercatat

- Siapa yang melakukan aksi
- Aksi apa yang dilakukan (buat tiket, update status, dll)
- Kapan aksi dilakukan
- Detail perubahan data

### Cara Penggunaan

1. Buka menu **Activity Log**
2. Gunakan filter tanggal untuk mempersempit pencarian
3. Cari berdasarkan nama user atau jenis aksi

---

## 13. Tools & Utilities

Kumpulan alat bantu untuk kebutuhan operasional NOC.

### Fitur yang Tersedia

- **Kalkulator MTTR** — Hitung Mean Time To Repair
- **Konverter Waktu** — Konversi zona waktu
- Utilitas lainnya sesuai kebutuhan operasional

---

## 14. Work Orders

Manajemen Work Order untuk proses aktivasi, upgrade, downgrade, dan berhenti berlangganan layanan client.

### Jenis Work Order

| Tipe | Keterangan |
|---|---|
| Berlangganan | Aktivasi layanan baru |
| Upgrade | Peningkatan kapasitas/layanan |
| Downgrade | Penurunan kapasitas/layanan |
| Berhenti Sementara | Suspend layanan sementara |
| Berhenti Berlangganan | Terminasi layanan |

### Cara Membuat Work Order

1. Buka menu **Work Orders**
2. Klik **"+ Work Order Baru"**
3. Pilih tipe WO
4. Isi data client dan detail pekerjaan
5. Klik **"Simpan"**

### Status Work Order

- **PENDING** — Menunggu diproses
- **IN PROGRESS** — Sedang dikerjakan
- **DONE** — Selesai
- **CANCEL** — Dibatalkan

---

## 15. Tracker

Sistem pelacakan progres pekerjaan tim secara real-time.

### Cara Penggunaan

1. Buka menu **Tracker**
2. Lihat daftar tugas yang sedang berjalan
3. Update progres tugas yang kamu kerjakan
4. Tandai selesai saat pekerjaan selesai

---

## 16. Broadcast

Fitur untuk mengirim pengumuman/pesan penting ke semua user yang sedang aktif di sistem.

> Hanya **Admin** dan **SUPER_DEV** yang dapat mengirim broadcast.

### Cara Menggunakan

1. Buka menu **Broadcast**
2. Tulis pesan pengumuman
3. Pilih target penerima (semua user atau role tertentu)
4. Klik **"Kirim"**

Pesan broadcast akan muncul sebagai **banner** di bagian atas halaman untuk semua user yang dituju.

---

## 17. Profil & Pengaturan Akun

Halaman untuk mengatur informasi pribadi dan integrasi akun.

### Informasi Pribadi

1. Klik nama/avatar di pojok kiri bawah sidebar → **Profil**
2. Update informasi:
   - **Nama Lengkap**
   - **Foto Profil** (maks. 2 MB)
3. Klik **"Simpan Perubahan"**

### Ganti Password

1. Di halaman Profil, scroll ke bagian **"Keamanan Akun"**
2. Isi **Password Baru** dan **Ulangi Password**
3. Klik **"Ganti Password"**

### Integrasi Odoo Helpdesk

Agar tiket yang dibuat di sistem ini otomatis tersinkron ke Odoo:

1. Di halaman Profil, scroll ke **"Integrasi Odoo Helpdesk"**
2. Cara mendapatkan API Key Odoo:
   - Login ke Odoo dengan email yang sama
   - Klik foto profil → **Preferences**
   - Buka tab **Account Security**
   - Klik **New API Key** → beri nama → **Generate**
   - Salin API Key (hanya ditampilkan sekali!)
3. Paste API Key ke field **"Odoo API Key"**
4. Klik **"Simpan & Verifikasi"**
5. Status akan berubah menjadi **"Terhubung"** jika berhasil

> ⚠️ API Key bersifat rahasia. Jangan bagikan ke siapapun. Tiket akan tercatat atas nama akun Odoo kamu.

---

## 18. Manage Users (Admin)

Halaman khusus **Admin** dan **SUPER_DEV** untuk mengelola akun user.

### Melihat Daftar User

1. Buka menu **Manage Users**
2. Lihat semua user yang terdaftar beserta role-nya

### Mengubah Role User

1. Klik user yang ingin diubah
2. Pilih role baru dari dropdown
3. Klik **"Simpan"**

### Override Permission

Untuk memberikan akses khusus di luar role default:

1. Klik user yang ingin diatur
2. Di bagian **"Permission Override"**, aktifkan/nonaktifkan permission spesifik
3. Override akan menimpa hak akses role default untuk user tersebut

### Mengundang User Baru

1. Klik **"+ Tambah User"**
2. Masukkan email user
3. Pilih role
4. Klik **"Kirim Undangan"**

User akan mendapat email undangan untuk mengatur password.

---

## 19. Integrasi Telegram

Sistem memiliki **2 Bot Telegram** untuk mendukung operasional:

### Bot 1 — Notifikasi Log

Mengirim notifikasi aktivitas penting ke **Group Telegram NOC** secara otomatis.

**Contoh notifikasi yang dikirim:**
- Tiket baru dibuat
- Status tiket diubah
- Tiket diselesaikan

**Konfigurasi (dilakukan Admin):**
```
TELEGRAM_LOG_BOT_TOKEN = [token bot]
TELEGRAM_LOG_GROUP_ID  = [ID group]
TELEGRAM_LOG_TOPIC_ID  = [ID topic/thread]
```

### Bot 2 — Sistem Approval Backbone

Mengirim **DM (Direct Message)** ke Admin saat ada request kode backbone baru dari user NOC.

**Cara kerja:**
1. User NOC request kode backbone baru
2. Bot mengirim DM ke semua Admin dengan tombol inline:
   - ✅ **Setujui** — kode langsung masuk ke Index NOC
   - ❌ **Tolak** — request dihapus
3. Setelah Admin klik, pesan di-update dengan status hasil keputusan

**Syarat:**
- Admin harus sudah pernah klik **START** ke Bot 2 terlebih dahulu
- Admin yang ingin menerima notifikasi harus memiliki **Telegram User ID** yang terdaftar di profil

**Cara mendapatkan Telegram User ID:**
- Cari bot `@userinfobot` di Telegram
- Klik Start
- Bot akan membalas dengan User ID kamu

---

## 20. Integrasi Odoo Helpdesk

Sistem terintegrasi dengan **Odoo Helpdesk** untuk sinkronisasi tiket otomatis.

### Cara Kerja

Setiap tiket yang dibuat/diupdate di NOC Web akan otomatis:
- Membuat tiket baru di Odoo (jika belum ada)
- Menambahkan **log note** saat status berubah
- Mencatat nama teknisi yang melakukan update

### Konfigurasi

Konfigurasi dilakukan di level sistem (env variables):

| Variable | Keterangan |
|---|---|
| `ODOO_URL` | URL instance Odoo |
| `ODOO_DB` | Nama database Odoo |
| `ODOO_USERNAME` | Email akun Odoo teknis |
| `ODOO_API_KEY` | API Key akun Odoo teknis |
| `ODOO_NOC_TEAM_ID` | ID Tim NOC di Odoo |

### Status Sinkronisasi

- **Terhubung** ✅ — Integrasi berjalan normal
- **Belum Dikonfigurasi** ⚠️ — User belum set API Key di profil
- **Gagal** ❌ — Periksa API Key atau koneksi ke Odoo

---

## Troubleshooting Umum

| Masalah | Solusi |
|---|---|
| Tidak bisa login | Pastikan email dan password benar. Hubungi Admin jika lupa password |
| Menu tidak muncul | Hubungi Admin untuk cek hak akses role kamu |
| Tiket tidak tersync ke Odoo | Cek API Key Odoo di halaman Profil |
| Notifikasi Telegram tidak masuk | Pastikan sudah klik START ke Bot Telegram |
| WA Report kosong | Pastikan ada tiket aktif (OPEN/ON PROGRESS/PENDING) |
| Error saat tambah kode backbone | Hubungi Admin — mungkin perlu approval terlebih dahulu |

---

## Kontak & Support

Untuk pertanyaan teknis atau kendala sistem, hubungi:

- **SUPER_DEV / Admin Sistem** — melalui internal chat atau Telegram group NOC

---

*Dokumen ini bersifat internal dan rahasia. Dilarang disebarluaskan di luar tim Fibermedia.*
