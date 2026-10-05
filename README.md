# Alman Klubu — landing (single page)

Statik sayt: `index.html` + `assets/`. Backend yoxdur. Sınaq forması WhatsApp-a hazır mesaj açır.

## Məzmunu dəyişmək
`index.html` faylının sonundakı `KONFİQURASİYA` blokunda:
- `CONFIG` — WhatsApp nömrəsi, Instagram
- `GROUPS` — qrup cədvəli, boş yerlər, sınaq vaxtları (GG.AA SS:DD)
- `PRICING`, `TEACHERS`, `LEVELS`, `JOBS`

## Deploy — Cloudflare Pages (tövsiyə)
1. GitHub-da repo yarat, bu qovluğu push et
2. dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git
3. Framework: None, Build command: boş, Output directory: `/`
4. Custom domains → öz domenini əlavə et

## Deploy — GitHub Pages
Repo → Settings → Pages → Source: `main` / root. Ünvan: `https://<user>.github.io/<repo>/`

## Qrup cədvəli — Google Sheets
Sayt cədvəli "Alman Klubu — qrup cədvəli" Google Sheet-indən oxuyur (ID `index.html`-də `CONFIG.scheduleSheetId`).
- Sheet: Share → General access → "Anyone with the link" → Viewer
- Sütun adlarını dəyişməyin: Səviyyə, Günlər, Saat, Başlama, Boş yer, Sınaq vaxtları, Aktiv
- Sınaq vaxtları `;` ilə ayrılır. Aktiv = "xeyr" olan sətir saytda görünmür. Boş yer = 0 → "yer yoxdur".
- Dəyişiklik saytda səhifə yenilənəndə görünür (Google bir neçə dəqiqəyə qədər keşləyə bilər).
- Sheet oxunmasa, `index.html`-dəki ehtiyat cədvəl (`GROUPS`) göstərilir.
