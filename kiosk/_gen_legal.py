"""Generates the four legal pages from a shared shell.

Content is written to match what the kiosk ACTUALLY does — pickup not shipping,
name + phone only, UPI direct with no card storage, and the real third-party
calls (QR service, font/JS CDNs, database host). Business identity comes from
js/legal-details.js at runtime so there is one place to edit.
"""
import pathlib

OUT = pathlib.Path(__file__).parent / "public"
ORIGIN = "https://kiosk-nine-tau.vercel.app"

SELLER_CARD = """      <div class="legal-card">
        <dl>
          <dt>Seller</dt><dd data-biz="legalName"></dd>
          <dt>Trading as</dt><dd data-biz="brandName"></dd>
          <dt>Address</dt><dd data-biz="addressLines"></dd>
          <dt>Phone</dt><dd><a data-biz-tel="phone" href="#"></a></dd>
          <dt>Email</dt><dd><a data-biz-mailto="email" href="#"></a></dd>
          <dt>GSTIN</dt><dd data-biz="gstin"></dd>
        </dl>
      </div>"""

GRIEVANCE_CARD = """      <div class="legal-card">
        <dl>
          <dt>Grievance Officer</dt><dd data-biz="grievanceOfficer.name"></dd>
          <dt>Email</dt><dd><a data-biz-mailto="grievanceOfficer.email" href="#"></a></dd>
          <dt>Phone</dt><dd><a data-biz-tel="grievanceOfficer.phone" href="#"></a></dd>
        </dl>
      </div>"""

FOOTER = """  <footer class="legal-footer">
    <nav>
      <a href="index.html">Home</a>
      <a href="privacy.html">Privacy Policy</a>
      <a href="terms.html">Terms of Service</a>
      <a href="refund.html">Cancellation &amp; Refunds</a>
      <a href="contact.html">Contact &amp; Grievances</a>
    </nav>
    <div>&copy; 2026 <span data-biz="brandName"></span>. Small Gifts, Big Meanings.</div>
  </footer>"""


def shell(slug, title, heading, body):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} — YoursGifts</title>
    <meta name="description" content="{heading} for YoursGifts custom 3D-printed gifts.">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="{ORIGIN}/{slug}.html">
    <link rel="icon" href="/favicon.ico" sizes="any">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    <meta name="theme-color" content="#FF4D2E">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/kiosk.css?v=desk3">
    <link rel="stylesheet" href="css/legal.css?v=wa1">
</head>
<body>
  <main class="legal-page">
    <div class="legal-topbar">
      <img src="LOGO WITH SLOGAN.png" alt="YoursGifts">
      <a class="legal-back" href="index.html">&larr; Back to shop</a>
    </div>

    <div id="legalDraftBanner" hidden></div>

    <h1>{heading}</h1>
    <p class="legal-updated">Last updated: <span data-biz="lastUpdated"></span></p>

{body}
  </main>

{FOOTER}

  <script type="module">
    import {{ renderLegalPage }} from './js/legal-details.js?v=wa1';
    renderLegalPage();
  </script>
</body>
</html>
"""


PRIVACY = f"""      <p>This policy explains what <span data-biz="brandName"></span> collects when you
      order a custom 3D print from us, why we collect it, and what we do with it. It is
      written to meet our obligations under India's Digital Personal Data Protection
      Act, 2023.</p>

      <h2>Who we are</h2>
{SELLER_CARD}

      <h2>What we collect</h2>
      <p>Deliberately very little. To make and hand over your order we collect:</p>
      <ul>
        <li><strong>Your name</strong> — so we can call out the right order at collection.</li>
        <li><strong>Your 10-digit phone number</strong> — so we can tell you your print is ready.</li>
        <li><strong>Your design</strong> — the text, font, colours and options you chose.</li>
        <li><strong>Your UPI reference number</strong> — the 12-digit reference you enter so we can match your payment.</li>
        <li><strong>Order and pricing details</strong> — weight, print time and amount, which we calculate ourselves.</li>
      </ul>

      <h2>What we do NOT collect</h2>
      <ul>
        <li><strong>No card or bank details.</strong> Payment happens inside your own UPI app.
        We never see, handle or store a card number, UPI PIN or bank credential.</li>
        <li><strong>No address</strong> — orders are collected in person, so we never ask for one.</li>
        <li><strong>No email address.</strong></li>
        <li><strong>No tracking or advertising cookies</strong>, and no analytics or advertising pixels.</li>
        <li><strong>No accounts or passwords</strong> — you order as a guest.</li>
      </ul>

      <h2>Why we can use it</h2>
      <p>We process this information to perform the contract you enter into when you place
      an order, and to keep the business records we are required to keep. If you withdraw
      your details before printing starts we simply cancel the order.</p>

      <h2>How long we keep it</h2>
      <p>Order records, including your name and phone number, are kept as business and tax
      records. Where we no longer need to keep a record, we delete it. You can ask us to
      delete your details at any time using the contact below; if an order is still being
      made or is unpaid, we will complete or cancel it first.</p>

      <h2>Who else sees it</h2>
      <p>We do not sell your data or share it for marketing. These service providers
      handle data on our behalf, or receive it as a technical consequence of the site
      working:</p>
      <ul>
        <li><strong>Our hosting and database providers</strong> — they store the order record and serve this site.</li>
        <li><strong>QR code service (api.qrserver.com)</strong> — when you choose to pay by
        scanning, the payment request (our UPI ID, the amount and a short order note) is
        sent to this third-party service to draw the QR image. Your name and phone number
        are not sent.</li>
        <li><strong>Google Fonts (fonts.googleapis.com, fonts.gstatic.com)</strong> — loads the
        typefaces used on this site; your IP address is visible to Google as part of that request.</li>
        <li><strong>Content delivery networks (cdn.jsdelivr.net, esm.sh)</strong> — deliver the
        3D preview code; your IP address is visible to them.</li>
        <li><strong>WhatsApp</strong> — if we message you that your order is ready, that
        message goes through WhatsApp.</li>
      </ul>

      <h2>What is stored on your device</h2>
      <p>We use your browser's local storage to remember your in-progress design so you do
      not lose it if the page reloads. It stays on your device, is not sent to us as
      personal data, and clearing your browser data removes it. We do not use tracking cookies.</p>

      <h2>Your rights</h2>
      <p>You may ask us to show you the personal data we hold about you, correct it, or
      delete it. You may also withdraw consent or complain about how we have handled your
      data. Write to our Grievance Officer:</p>
{GRIEVANCE_CARD}
      <p>We will respond within 30 days.</p>

      <h2>Children</h2>
      <p>Our products are often bought for children, but we do not knowingly collect
      personal data directly from anyone under 18. A parent or guardian should place the order.</p>

      <h2>Security</h2>
      <p>This site is served over HTTPS and order data is held in an access-controlled
      database. No system is perfectly secure; if a breach affects your data we will notify
      you and the authorities as required.</p>

      <h2>Changes</h2>
      <p>If we change this policy we will update the date at the top of this page.</p>"""


TERMS = f"""      <p>These terms apply when you order a custom 3D-printed item from
      <span data-biz="brandName"></span>. Placing an order means you accept them.</p>

      <h2>Who you are contracting with</h2>
{SELLER_CARD}

      <h2>What we make</h2>
      <p>Every item is <strong>made to order from the text and options you choose</strong> —
      keychains, nameplates, letter tiles, word art and similar 3D-printed gifts. Because
      each piece is personalised, please check your spelling, font and colours on the 3D
      preview before you pay.</p>

      <h2>The 3D preview</h2>
      <p>The on-screen preview is an accurate representation of the shape we will print, but
      it is a screen rendering. Real filament colour, surface finish and layer texture will
      differ slightly from the preview, and printed plastic shows visible layer lines. This
      is normal for 3D printing and is not a defect.</p>

      <h2>Prices and payment</h2>
      <ul>
        <li>Prices are shown in Indian Rupees and are calculated from the size, weight and
        print time of the design you build, so changing your design changes the price.</li>
        <li>Payment is by UPI, made directly to us from your own UPI app.</li>
        <li>After paying you enter your 12-digit UPI reference number. <strong>We begin
        printing only after we have confirmed the payment has actually reached us.</strong>
        Entering a reference number that does not correspond to a real payment is not an order.</li>
      </ul>

      <h2>Collection</h2>
      <p>Orders are made and handed over in person at our kiosk, usually within
      <span data-biz="fulfilmentWindow"></span> of confirmed payment. We do not ship. Busy
      periods, large designs or printer maintenance can make this longer, and we will tell
      you if so. Please collect on the same day unless we agree otherwise.</p>

      <h2>Acceptable content</h2>
      <p>We will decline, and refund, any order whose text is unlawful, abusive, hateful,
      obscene, or infringes someone else's trade mark or copyright. You confirm you have the
      right to use the text and names you submit. We are not responsible for spelling as
      submitted by you.</p>

      <h2>Product care and safety</h2>
      <p>Items are printed in PLA-type plastic. They are decorative and everyday-use items,
      not toys for children under three, and are not suitable for sustained heat (do not
      leave in a closed car or in direct sun), dishwashers, or contact with food. Small parts
      may present a choking hazard for young children. Fine details can snap under force.</p>

      <h2>Our liability</h2>
      <p>If we get your order wrong we will reprint or refund it, as set out in our
      <a href="refund.html">Cancellation &amp; Refunds policy</a>. Beyond that, and except
      where the law does not allow it to be limited, our liability for any order is limited
      to the amount you paid for it. Nothing in these terms limits your rights under the
      Consumer Protection Act, 2019.</p>

      <h2>Intellectual property</h2>
      <p>The site, its 3D designs and the product templates remain ours. You keep the rights
      in the text you supply, and you grant us permission to use it for the purpose of
      producing your order.</p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of India, and the courts at
      <span data-biz="jurisdictionCity"></span> have jurisdiction over any dispute.</p>

      <h2>Questions</h2>
      <p>See <a href="contact.html">Contact &amp; Grievances</a>.</p>"""


REFUND = f"""      <p>Everything we sell is personalised and made to order, which affects when it can be
      cancelled. This policy explains exactly when you can cancel and when we refund.</p>

      <h2>Cancelling before we start printing</h2>
      <p><strong>Free cancellation, full refund.</strong> If you tell us before the printer
      starts your item, we cancel it and refund you in full. Since we usually begin within
      minutes of confirmed payment, tell us immediately — at the counter, or by phone.</p>

      <h2>Once printing has started</h2>
      <p>A personalised item cannot be resold, so once printing has begun we cannot cancel or
      accept a return simply because you changed your mind or mis-typed the text. This is
      permitted for goods made to a consumer's specification.</p>

      <h2>When we DO refund or reprint</h2>
      <p>We will reprint at no charge, or refund you in full, if:</p>
      <ul>
        <li>the item does not match the design you approved (wrong text, wrong colour, wrong style);</li>
        <li>it arrives broken, warped, badly under-extruded or otherwise defective;</li>
        <li>we cannot fulfil your order at all — for example a printer failure or a filament colour we have run out of;</li>
        <li>we decline your order under our <a href="terms.html">Terms of Service</a>.</li>
      </ul>
      <p>Please raise it with us <strong>within 48 hours of collection</strong>, with the item
      and your order number, so we can see the problem. Visible layer lines, minor colour
      variation between filament batches, and slight surface texture are characteristics of
      3D printing rather than defects.</p>

      <h2>Payments we cannot match</h2>
      <p>If you paid but we cannot find the payment against the reference you entered, we
      will hold the order and contact you. If a payment reaches us for an order we never
      made, we refund it in full.</p>

      <h2>How refunds are made</h2>
      <p>Refunds go back to the same UPI ID that paid us. We initiate them within
      <strong>2 working days</strong> of agreeing the refund; how quickly it appears then
      depends on your bank, typically 3–7 working days. We do not charge a cancellation fee.</p>

      <h2>Uncollected orders</h2>
      <p>We will hold a finished order for <strong>7 days</strong> and remind you. After
      that, because the item is personalised and cannot be resold, we may dispose of it and
      cannot refund it.</p>

      <h2>How to request a cancellation or refund</h2>
      <p>Contact us as soon as possible:</p>
{GRIEVANCE_CARD}
      <p>Full contact details are on our <a href="contact.html">Contact page</a>.</p>"""


CONTACT = f"""      <p>We would rather hear from you than have you stuck. Reach us any of these ways.</p>

      <h2>Seller details</h2>
{SELLER_CARD}

      <h2>Grievance Officer</h2>
      <p>As required by the Consumer Protection (e-Commerce) Rules, 2020, complaints go to a
      named officer, who will acknowledge your complaint within 48 hours and resolve it
      within one month:</p>
{GRIEVANCE_CARD}

      <h2>What to include</h2>
      <ul>
        <li>Your order number, if you have one.</li>
        <li>The phone number you gave when ordering.</li>
        <li>A photo, if the item is damaged or wrong.</li>
      </ul>

      <h2>Data protection requests</h2>
      <p>To see, correct or delete the personal data we hold about you, write to the
      Grievance Officer above. See our <a href="privacy.html">Privacy Policy</a> for what we hold.</p>

      <h2>Related policies</h2>
      <ul>
        <li><a href="terms.html">Terms of Service</a></li>
        <li><a href="refund.html">Cancellation &amp; Refunds</a></li>
        <li><a href="privacy.html">Privacy Policy</a></li>
      </ul>"""


PAGES = [
    ("privacy", "Privacy Policy", "Privacy Policy", PRIVACY),
    ("terms", "Terms of Service", "Terms of Service", TERMS),
    ("refund", "Cancellation & Refunds", "Cancellation &amp; Refund Policy", REFUND),
    ("contact", "Contact & Grievances", "Contact &amp; Grievance Redressal", CONTACT),
]

for slug, title, heading, body in PAGES:
    path = OUT / f"{slug}.html"
    path.write_text(shell(slug, title, heading, body), encoding="utf-8")
    print(f"wrote {path.relative_to(OUT.parent)}  ({len(body.splitlines())} content lines)")
