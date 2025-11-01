📁 Project Root/
├── 📄 server.js              # Main server entry point
├── 📄 app.js                 # Express app configuration
├── 📁 config/                # Configuration files
│   ├── database.js          # MongoDB connection
│   └── whatsapp.js          # WhatsApp client config
├── 📁 services/              # Business logic services
│   ├── whatsapp.service.js  # WhatsApp client management
│   └── qr.service.js        # QR code generation & broadcasting
├── 📁 controllers/           # Route controllers
│   ├── qr.controller.js     # QR page & stream handlers
│   ├── message.controller.js # Message sending logic
│   └── status.controller.js  # Status & health endpoints
├── 📁 routes/                # Route definitions
│   ├── index.js             # Main router
│   ├── qr.routes.js         # QR routes
│   ├── message.routes.js    # Message routes
│   └── status.routes.js     # Status routes
├── 📁 middleware/            # Middleware
│   └── errorHandler.js      # Error handling
└── 📁 utils/                 # Utility functions
    └── phoneNumber.js       # Phone number normalization
