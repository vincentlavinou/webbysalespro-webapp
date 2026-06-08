# Tracking Embed Registrations with Hyros (and other ad trackers)

This guide is for the **ads team** and anyone setting up an embedded WebiSalesPro
registration widget on a landing page that runs Hyros (or a similar pixel/tracker).

## TL;DR

- **Do NOT put the Hyros universal script inside the embed's "Header Scripts" field.**
  It runs inside our iframe, where it has no ad click ID, so it throws
  `Cannot read properties of undefined (reading 'clickId')` and cannot attribute
  the lead.
- **Put the Hyros universal script on your host landing page** (the page that
  contains the embed), exactly where Hyros tells you to install it.
- **Add the small listener snippet below** to that same host page. Our embed
  sends the registration up to your page when someone signs up, and the listener
  forwards it to Hyros — in the top window, where the ad click is tracked.

---

## Why the script can't live inside the embed

The embedded registration form loads in an **iframe** served from
`https://events.webisalespro.com`. That iframe is a different origin from your
landing page.

Hyros's universal script is built to run on the **top-level landing page**. When a
visitor arrives from a Meta/Google/etc. ad, the ad click ID lives on that top page
(URL params + cookies). Inside our iframe:

- the ad click ID is **not present** (it's on the parent page, cross-origin), and
- the iframe **can't read the parent** to recover it.

So Hyros has nothing to attribute the lead to → it errors and the data is lost.
Moving the script to the host page fixes the error **and** restores attribution.

---

## Setup (one time, per landing page)

### Step 1 — Install the Hyros universal script on the host page

Keep your normal Hyros install snippet on the landing page `<head>`, e.g.:

```html
<script>
  var head = document.head;
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = "https://<your-id>.t.hyros.com/v1/lst/universal-script?ph=<your-hash>&tag=!clicked&ref_url=" + encodeURI(document.URL);
  head.appendChild(script);
</script>
```

> Leave this OUT of the WebiSalesPro embed "Header Scripts" field.

### Step 2 — Add the registration listener to the host page

Paste this on the **same host landing page**, after the Hyros script:

```html
<script>
  window.addEventListener("message", function (event) {
    // Only trust messages from the WebiSalesPro embed
    if (event.origin !== "https://events.webisalespro.com") return;

    var msg = event.data;
    if (!msg || msg.type !== "wsp:registration:success") return;

    // Forward the lead to Hyros in the top window, where the ad click is tracked.
    // Use the lead/identify call from YOUR Hyros install docs. Example shape:
    if (window.hyros && typeof window.hyros.identify === "function") {
      window.hyros.identify({
        email: msg.email,
        phoneNumber: msg.phone,        // may be undefined
        firstName: msg.firstName,
        lastName: msg.lastName,
      });
    }

    // Optional: also push to GTM / Meta / Google for the same conversion
    // window.dataLayer && window.dataLayer.push({ event: "wsp_registration", lead: msg });
  });
</script>
```

> ⚠️ The `window.hyros.identify(...)` call is a **placeholder**. Confirm the exact
> method name and payload against your current Hyros install instructions — the
> important part is that the email reaches Hyros from the **top window**.

That's it. No changes are needed inside the embed itself.

---

## What our embed sends

On every successful registration, the embed posts this message to the host page
(`window.parent`):

| Field       | Type              | Notes                                  |
|-------------|-------------------|----------------------------------------|
| `type`      | `string`          | Always `"wsp:registration:success"`    |
| `webinarId` | `string`          | The webinar's ID                       |
| `source`    | `string`          | The embed `source` (e.g. `meta-ads`)   |
| `email`     | `string`          | Registrant email                       |
| `firstName` | `string`          | Registrant first name                  |
| `lastName`  | `string`          | Registrant last name                   |
| `phone`     | `string \| undefined` | Present only if the visitor entered one |

- **Origin:** messages come from `https://events.webisalespro.com`. Always check
  `event.origin` (as the snippet does) before trusting the data.
- **Timing:** the message fires the moment registration succeeds, before any
  redirect, so it is safe to read synchronously in the listener.

---

## Testing the setup

1. Open your landing page with the embed and your browser dev tools (Console).
2. Confirm the Hyros script loads on the page (you'll see a `[UTS] [fp]: …` log)
   and **no** `clickId` error appears.
3. Complete a test registration in the embed.
4. In the Console, you should see your listener fire. Add a
   `console.log(msg)` line temporarily inside the listener to confirm the payload.
5. Check Hyros to confirm the lead was recorded against the ad click.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Cannot read properties of undefined (reading 'clickId')` | Hyros script is inside the embed iframe | Move it to the host page (Step 1) |
| Lead reaches Hyros but with **no ad attribution** | Hyros script not on the page the visitor actually landed on | Install Hyros on the true landing page (top window) |
| Listener never fires | Wrong `event.origin` check, or listener added before page load | Ensure origin is exactly `https://events.webisalespro.com` |
| Phone missing | Visitor didn't enter a phone number | Expected — `phone` is optional |
