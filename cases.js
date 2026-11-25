export const groups = [
  "SQL injection",
  "Cross-site scripting (XSS)",
  "Insecure authentication",
  "Exposed credentials",
  "Broken access control",
  "Unsafe input handling",
  "Cryptographic failures",
  "Security misconfiguration"
];
export const cases = [
  {
    "id": "sql-01",
    "category": "SQL injection",
    "level": 1,
    "title": "Search under pressure",
    "file": "search.py",
    "context": "The customer directory accepts a search term.",
    "code": "term = request.args[\"name\"]\nquery = \"SELECT * FROM users WHERE name = '\" + term + \"'\"\nreturn db.execute(query).fetchall()",
    "patches": [
      "db.execute(\"SELECT * FROM users WHERE name = ?\", (term,))",
      "db.execute(query.lower())",
      "db.execute(query.strip())"
    ],
    "explanation": "Bound parameters separate data from SQL syntax. Lowercasing and trimming do not prevent injection.",
    "cwe": "CWE-89",
    "hint": "Look at how request data enters the query."
  },
  {
    "id": "sql-02",
    "category": "SQL injection",
    "level": 2,
    "title": "Invoice lookup",
    "file": "invoice.js",
    "context": "A PostgreSQL service reads an invoice by ID.",
    "code": "const id = req.query.id;\nconst rows = await pool.query(\n  \"SELECT * FROM invoices WHERE id = \" + id\n);",
    "patches": [
      "await pool.query(\"SELECT * FROM invoices WHERE id = $1\", [id])",
      "await pool.query(\"SELECT * FROM invoices WHERE id = \" + encodeURI(id))",
      "await pool.query(\"SELECT * FROM invoices WHERE id = \" + id.trim())"
    ],
    "explanation": "PostgreSQL placeholders bind values independently of the query. URL encoding and trimming are not SQL defences.",
    "cwe": "CWE-89",
    "hint": "The driver supports positional parameters."
  },
  {
    "id": "sql-03",
    "category": "SQL injection",
    "level": 3,
    "title": "Sort order trap",
    "file": "reports.py",
    "context": "The report endpoint allows users to choose a sort column.",
    "code": "sort = request.args.get(\"sort\", \"created_at\")\nreturn db.execute(\"SELECT * FROM reports ORDER BY \" + sort)",
    "patches": [
      "allowed = {\"date\": \"created_at\", \"name\": \"name\"}\ncolumn = allowed.get(sort, \"created_at\")\nreturn db.execute(\"SELECT * FROM reports ORDER BY \" + column)",
      "return db.execute(\"SELECT * FROM reports ORDER BY ?\", (sort,))",
      "return db.execute(\"SELECT * FROM reports ORDER BY \" + sort[:30])"
    ],
    "explanation": "SQL identifiers generally cannot be bound as values. Map public choices to fixed, trusted column names.",
    "cwe": "CWE-89",
    "hint": "Column names are identifiers rather than values."
  },
  {
    "id": "xss-01",
    "category": "Cross-site scripting (XSS)",
    "level": 1,
    "title": "Welcome banner",
    "file": "profile.js",
    "context": "The greeting displays a visitor's chosen name as plain text.",
    "code": "const name = new URLSearchParams(location.search).get(\"name\");\ndocument.querySelector(\"#welcome\").innerHTML = name;",
    "patches": [
      "document.querySelector(\"#welcome\").textContent = name;",
      "document.querySelector(\"#welcome\").innerHTML = name.trim();",
      "document.querySelector(\"#welcome\").innerHTML = name.toLowerCase();"
    ],
    "explanation": "textContent renders data as text rather than parsing HTML. Case conversion and trimming do not make HTML safe.",
    "cwe": "CWE-79",
    "hint": "The destination does not need to render markup."
  },
  {
    "id": "xss-02",
    "category": "Cross-site scripting (XSS)",
    "level": 2,
    "title": "Comments feed",
    "file": "comments.html",
    "context": "A Jinja template prints comments that should contain only text.",
    "code": "<div class=\"comment\">{{ comment.body | safe }}</div>",
    "patches": [
      "<div class=\"comment\">{{ comment.body }}</div>\n{# Keep HTML autoescaping enabled #}",
      "<div class=\"comment\">{{ comment.body | lower | safe }}</div>",
      "<div class=\"comment\">{{ comment.body | truncate(200) | safe }}</div>"
    ],
    "explanation": "Keep the template engine's context-aware HTML autoescaping enabled. Marking untrusted comments safe disables that protection.",
    "cwe": "CWE-79",
    "hint": "An explicit filter disables a framework safeguard."
  },
  {
    "id": "xss-03",
    "category": "Cross-site scripting (XSS)",
    "level": 3,
    "title": "Rich text review",
    "file": "editor.js",
    "context": "Users may submit formatted HTML. The application must preserve approved formatting.",
    "code": "preview.innerHTML = submittedHtml;",
    "patches": [
      "preview.innerHTML = DOMPurify.sanitize(submittedHtml, {\n  ALLOWED_TAGS: [\"p\", \"b\", \"i\", \"ul\", \"li\"],\n  ALLOWED_ATTR: []\n});",
      "preview.innerHTML = submittedHtml.replaceAll(\"<script>\", \"\");",
      "preview.innerHTML = submittedHtml.slice(0, 5000);"
    ],
    "explanation": "Use a maintained HTML sanitiser with a restrictive policy when markup is required. Removing one tag or limiting length is insufficient.",
    "cwe": "CWE-79",
    "hint": "Plain text would break the formatting requirement."
  },
  {
    "id": "auth-01",
    "category": "Insecure authentication",
    "level": 1,
    "title": "Password vault",
    "file": "accounts.py",
    "context": "New users are registered with a password.",
    "code": "def register(email, password):\n    db.save({\"email\": email, \"password\": password})",
    "patches": [
      "db.save({\"email\": email,\n         \"password_hash\": argon2_hasher.hash(password)})",
      "db.save({\"email\": email, \"password\": base64_encode(password)})",
      "db.save({\"email\": email, \"password\": password[::-1]})"
    ],
    "explanation": "Store salted, adaptive password hashes using an established Argon2id implementation. Encoding and reversing are reversible.",
    "cwe": "CWE-256",
    "hint": "Passwords must not be recoverable from the database."
  },
  {
    "id": "auth-02",
    "category": "Insecure authentication",
    "level": 2,
    "title": "Login flood",
    "file": "login.js",
    "context": "The authentication endpoint has no attempt limits.",
    "code": "app.post(\"/login\", async (req, res) => {\n  const user = await verifyCredentials(req.body);\n  return user ? issueSession(res, user) : deny(res);\n});",
    "patches": [
      "app.post(\"/login\", loginRateLimit, async (req, res) => {\n  const user = await verifyCredentials(req.body);\n  return user ? issueSession(res, user) : deny(res);\n});\n// Shared per-account and per-source limits",
      "app.post(\"/login\", async (req, res) => {\n  await sleep(100);\n  return authenticate(req, res);\n});",
      "// Rename /login to /private-login"
    ],
    "explanation": "Use shared, bounded attempt controls with account and source signals, monitoring and safe recovery. A short delay or obscure route does not reliably limit guesses.",
    "cwe": "CWE-307",
    "hint": "Consider repeated attempts from multiple requests."
  },
  {
    "id": "auth-03",
    "category": "Insecure authentication",
    "level": 3,
    "title": "Trust the token?",
    "file": "session.js",
    "context": "A service accepts signed access tokens issued by its identity provider.",
    "code": "const claims = jwt.decode(req.headers.authorization.slice(7));\nreq.user = claims.sub;",
    "patches": [
      "const claims = jwt.verify(token, trustedPublicKey, {\n  algorithms: [\"RS256\"], issuer: ISSUER, audience: AUDIENCE\n});\nrequireValidExpiryAndSubject(claims);\nreq.user = claims.sub;",
      "const claims = jwt.decode(token);\nif (claims.sub) req.user = claims.sub;",
      "req.user = JSON.parse(atob(token.split(\".\")[1])).sub;"
    ],
    "explanation": "Decoding does not verify integrity. Validate the signature, expected algorithm, issuer, audience and required claims using trusted configuration.",
    "cwe": "CWE-347",
    "hint": "Reading a token and trusting it are different operations."
  },
  {
    "id": "secret-01",
    "category": "Exposed credentials",
    "level": 1,
    "title": "Key in source",
    "file": "config.js",
    "context": "A private service key was committed to a public repository. The displayed key is fictional.",
    "code": "const SERVICE_KEY = \"EXAMPLE_NOT_A_REAL_KEY\";\nconnectService(SERVICE_KEY);",
    "patches": [
      "// Revoke and rotate the exposed key first.\nconst key = process.env.SERVICE_KEY;\nif (!key) throw new Error(\"Missing service key\");\nconnectService(key);",
      "const SERVICE_KEY = atob(\"RVhBTVBMRQ==\");",
      "// Move the existing key into another committed file."
    ],
    "explanation": "Revoke and rotate any exposed credential, remove it from source and inject a replacement through a secret manager or protected runtime configuration.",
    "cwe": "CWE-798",
    "hint": "Deleting a committed key does not make it secret again."
  },
  {
    "id": "secret-02",
    "category": "Exposed credentials",
    "level": 2,
    "title": "Debug spill",
    "file": "payments.js",
    "context": "The payment service logs incoming requests for debugging.",
    "code": "logger.info({ headers: req.headers, body: req.body });\nreturn processPayment(req);",
    "patches": [
      "logger.info({ requestId: req.id, event: \"payment_received\" });\nreturn processPayment(req);",
      "logger.debug(JSON.stringify(req.headers));",
      "logger.info({ token: req.headers.authorization, time: Date.now() });"
    ],
    "explanation": "Use an allowlist of non-sensitive metadata. Debug log levels still risk disclosing authentication headers or payment data.",
    "cwe": "CWE-532",
    "hint": "The logger does not need the request contents."
  },
  {
    "id": "secret-03",
    "category": "Exposed credentials",
    "level": 3,
    "title": "Frontend integration",
    "file": "client.js",
    "context": "A web app needs to call a third-party service using a privileged API key.",
    "code": "const key = import.meta.env.VITE_ADMIN_API_KEY;\nfetch(serviceUrl, { headers: { Authorization: key } });",
    "patches": [
      "// Browser calls an authenticated application endpoint.\nfetch(\"/api/service\", { method: \"POST\", body: payload });\n// Server validates permissions and uses its own scoped secret.",
      "// Obfuscate the bundled key before shipping.",
      "// Rename VITE_ADMIN_API_KEY to VITE_PUBLIC_TOKEN."
    ],
    "explanation": "Client bundles cannot keep secrets. Proxy only approved operations through an authenticated, authorised and rate-limited server endpoint using a scoped credential.",
    "cwe": "CWE-798",
    "hint": "Anything sent to the browser can be inspected."
  },
  {
    "id": "access-01",
    "category": "Broken access control",
    "level": 1,
    "title": "Private invoices",
    "file": "invoices.js",
    "context": "An authenticated user can request a personal invoice.",
    "code": "app.get(\"/invoice/:id\", requireLogin, async (req, res) => {\n  res.json(await db.invoice.findUnique({ where: { id: req.params.id } }));\n});",
    "patches": [
      "const invoice = await db.invoice.findFirst({\n  where: { id: req.params.id, ownerId: req.user.id }\n});\nif (!invoice) return res.sendStatus(404);\nres.json(invoice);",
      "// Hide invoice IDs from the navigation menu.",
      "// Convert numeric invoice IDs to UUIDs only."
    ],
    "explanation": "Check object ownership on the server. Authentication and unpredictable IDs are not substitutes for authorisation.",
    "cwe": "CWE-639",
    "hint": "Being logged in does not grant access to every invoice."
  },
  {
    "id": "access-02",
    "category": "Broken access control",
    "level": 2,
    "title": "Admin switch",
    "file": "roles.js",
    "context": "An endpoint changes another user's role.",
    "code": "app.post(\"/roles\", requireLogin, (req, res) => {\n  setRole(req.body.userId, req.body.role);\n  res.sendStatus(204);\n});",
    "patches": [
      "app.post(\"/roles\", requireLogin, requireRole(\"admin\"), validateRoleChange,\n  (req, res) => {\n    setRole(req.body.userId, req.body.role);\n    res.sendStatus(204);\n  });",
      "// Hide the admin button with CSS for ordinary users.",
      "if (req.body.isAdmin) setRole(req.body.userId, req.body.role);"
    ],
    "explanation": "Enforce server-side privilege checks using the authenticated identity, and validate which role changes are permitted.",
    "cwe": "CWE-862",
    "hint": "The client cannot decide its own privileges."
  },
  {
    "id": "access-03",
    "category": "Broken access control",
    "level": 3,
    "title": "Profile mass assignment",
    "file": "users.js",
    "context": "Users may update only their display name and biography.",
    "code": "await db.user.update({\n  where: { id: req.user.id }, data: req.body\n});",
    "patches": [
      "const { displayName, bio } = validatedProfileInput(req.body);\nawait db.user.update({\n  where: { id: req.user.id }, data: { displayName, bio }\n});",
      "delete req.body.isAdmin;\nawait updateUser(req.user.id, req.body);",
      "await updateUser(req.user.id, { ...req.body });"
    ],
    "explanation": "Allowlist editable fields using a schema. Denying one sensitive property may leave other protected fields writable.",
    "cwe": "CWE-915",
    "hint": "Only two fields are intended to be editable."
  },
  {
    "id": "input-01",
    "category": "Unsafe input handling",
    "level": 1,
    "title": "File cabinet",
    "file": "download.py",
    "context": "Users can download one of the three published public documents.",
    "code": "filename = request.args[\"file\"]\nreturn send_file(\"/srv/public/\" + filename)",
    "patches": [
      "files = {\"guide\": \"/srv/public/guide.pdf\",\n         \"faq\": \"/srv/public/faq.pdf\", \"terms\": \"/srv/public/terms.pdf\"}\npath = files.get(request.args[\"file\"])\nif path is None: abort(404)\nreturn send_file(path)",
      "return send_file(\"/srv/public/\" + filename.strip())",
      "return send_file(\"/srv/public/\" + filename.lower())"
    ],
    "explanation": "Map approved document IDs to trusted paths. Do not use an untrusted path directly.",
    "cwe": "CWE-22",
    "hint": "Users only need to choose from three known files."
  },
  {
    "id": "input-02",
    "category": "Unsafe input handling",
    "level": 2,
    "title": "Thumbnail worker",
    "file": "image.py",
    "context": "The worker resizes a server-selected image path using an external program.",
    "code": "os.system(\"convert \" + user_filename + \" -resize 200x200 thumb.png\")",
    "patches": [
      "path = resolveApprovedImage(user_filename)\nsubprocess.run([\"/usr/bin/convert\", path, \"-resize\",\n                \"200x200\", trustedOutputPath], check=True, shell=False)",
      "os.system(\"convert \" + user_filename.strip() + \" thumb.png\")",
      "os.system(\"convert \" + user_filename[:100] + \" thumb.png\")"
    ],
    "explanation": "Resolve a trusted path, avoid shell interpretation, use a fixed executable and pass arguments separately. Run the worker with restricted privileges.",
    "cwe": "CWE-78",
    "hint": "A shell interprets more than plain filenames."
  },
  {
    "id": "input-03",
    "category": "Unsafe input handling",
    "level": 3,
    "title": "Untrusted settings",
    "file": "settings.py",
    "context": "An API imports structured settings uploaded by users.",
    "code": "import pickle\nsettings = pickle.loads(request.data)\napply_settings(settings)",
    "patches": [
      "import json\nsettings = json.loads(request.data)\nvalidate_settings_schema(settings)\napply_settings(settings)",
      "settings = pickle.loads(request.data[:4096])",
      "settings = pickle.loads(bytes(request.data))"
    ],
    "explanation": "Do not deserialize untrusted pickle data. Use a data-only format and enforce a restrictive schema, size limits and validation.",
    "cwe": "CWE-502",
    "hint": "The serialisation format can represent executable behaviour."
  },
  {
    "id": "crypto-01",
    "category": "Cryptographic failures",
    "level": 1,
    "title": "Recovery codes",
    "file": "recovery.py",
    "context": "A one-time password reset token must be unpredictable.",
    "code": "import random\ncode = str(random.randint(100000, 999999))",
    "patches": [
      "import secrets\ncode = secrets.token_urlsafe(32)\n# Store a digest, enforce expiry and single use.",
      "code = str(int(time.time()))",
      "code = str(random.randint(100000, 999999)) * 2"
    ],
    "explanation": "Use a cryptographically secure random generator and sufficiently long tokens. Enforce short expiry, single use and protected storage.",
    "cwe": "CWE-338",
    "hint": "Choose randomness designed for security."
  },
  {
    "id": "crypto-02",
    "category": "Cryptographic failures",
    "level": 2,
    "title": "TLS shortcut",
    "file": "api.py",
    "context": "A service connects to a partner over HTTPS.",
    "code": "response = requests.get(PARTNER_URL, verify=False)",
    "patches": [
      "response = requests.get(PARTNER_URL, verify=True, timeout=10)",
      "response = requests.get(PARTNER_URL, verify=False, timeout=10)",
      "response = requests.get(PARTNER_URL.replace(\"https:\", \"http:\"))"
    ],
    "explanation": "Keep certificate and hostname verification enabled. Configure a trusted CA bundle if required rather than bypassing verification.",
    "cwe": "CWE-295",
    "hint": "Encryption is incomplete without authenticating the peer."
  },
  {
    "id": "crypto-03",
    "category": "Cryptographic failures",
    "level": 3,
    "title": "Export encryption",
    "file": "export.py",
    "context": "Sensitive exports need confidentiality and tamper detection.",
    "code": "cipher = AES.new(key, AES.MODE_ECB)\nreturn cipher.encrypt(pad(export_data, 16))",
    "patches": [
      "nonce = secrets.token_bytes(12)\nreturn nonce + AESGCM(key).encrypt(nonce, export_data, None)\n# Use managed keys and enforce nonce uniqueness per key.",
      "return base64.b64encode(export_data)",
      "return AES.new(key, AES.MODE_ECB).encrypt(pad(export_data, 16))"
    ],
    "explanation": "Authenticated encryption such as AES-GCM provides confidentiality and integrity when used with unique nonces and securely managed keys. ECB reveals patterns and lacks authentication.",
    "cwe": "CWE-327",
    "hint": "The mode must protect integrity as well as confidentiality."
  },
  {
    "id": "config-01",
    "category": "Security misconfiguration",
    "level": 1,
    "title": "Production traceback",
    "file": "app.py",
    "context": "A public production deployment exposes verbose errors.",
    "code": "app.run(host=\"0.0.0.0\", debug=True)",
    "patches": [
      "# Serve with a production WSGI server, debug disabled.\napp.config[\"DEBUG\"] = False\n# Return generic errors and protect internal logs.",
      "app.run(host=\"0.0.0.0\", debug=True, port=8080)",
      "# Keep debug enabled but rename the error page."
    ],
    "explanation": "Disable debugging in production and use a proper production server. Return generic error responses and log diagnostic details securely.",
    "cwe": "CWE-489",
    "hint": "Verbose development features do not belong in production."
  },
  {
    "id": "config-02",
    "category": "Security misconfiguration",
    "level": 2,
    "title": "Cookie policy",
    "file": "session.js",
    "context": "The application uses HTTPS and a cookie-based login session.",
    "code": "res.cookie(\"session\", token, { httpOnly: false, secure: false });",
    "patches": [
      "res.cookie(\"session\", token, {\n  httpOnly: true, secure: true, sameSite: \"lax\"\n});\n// Enforce expiry and CSRF protection separately.",
      "res.cookie(\"session\", token, { maxAge: 999999999 });",
      "res.cookie(\"session\", token, { httpOnly: true, secure: false });"
    ],
    "explanation": "Secure restricts cookies to HTTPS, HttpOnly restricts script access, and SameSite helps reduce cross-site requests. These controls complement explicit CSRF defences.",
    "cwe": "CWE-614",
    "hint": "Consider transport, script access and cross-site requests."
  },
  {
    "id": "config-03",
    "category": "Security misconfiguration",
    "level": 3,
    "title": "Cross-origin policy",
    "file": "cors.js",
    "context": "Only the company's portal may make credentialed cross-origin API requests.",
    "code": "app.use(cors({ origin: true, credentials: true }));",
    "patches": [
      "app.use(cors({ origin: \"https://portal.example.test\",\n  credentials: true }));\n// Keep authentication and authorisation on every endpoint.",
      "app.use(cors({ origin: true, credentials: true, maxAge: 600 }));",
      "app.use(cors({ origin: /example/, credentials: true }));"
    ],
    "explanation": "Use exact trusted origins, avoid broad reflection and retain server-side access checks. CORS does not replace authentication or authorisation.",
    "cwe": "CWE-942",
    "hint": "The trusted origin is known in advance."
  }
];
