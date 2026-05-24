# D-ID Custom Avatar

Drop your presenter image here as **`avatar.jpg`** (or `avatar.png`).

Requirements for D-ID:
- Face clearly visible, forward-facing
- Minimum 512×512 px recommended
- JPG or PNG

Then set this in `backend/.env`:

```env
# The public URL of your backend (needed so D-ID can fetch the image)
# For local dev, use ngrok: ngrok http 8000
BACKEND_PUBLIC_URL=https://your-ngrok-id.ngrok.io

# Or leave blank to use D-ID's default presenter
BACKEND_PUBLIC_URL=
```

When `BACKEND_PUBLIC_URL` is set and `backend/public/avatar.jpg` exists,
the AI interviewer will use your custom image as the D-ID presenter.
