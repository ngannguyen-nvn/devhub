# Simple Express.js App with TypeScript

A basic Express.js server application written in TypeScript. This setup includes hot-reloading for development using Nodemon and ts-node.

## Features

- Express.js server with TypeScript support
- Development script with auto-restart
- Production build using TypeScript compiler (tsc)
- Basic root route (`/`) responding with "Hello World from Express with TypeScript!"

## Prerequisites

- Node.js (v18+ recommended)
- npm or yarn

## Installation

1. Clone the repository:

   ```
   git clone git@github.com:ngannguyen-nvn/simple-express-ts.git
   cd simple-express-ts
   ```

2. Install dependencies:
   ```
   npm install
   ```

## Usage

### Development Mode

Run the development server with hot-reloading:

```
npm run dev
```

The server will start on `http://localhost:3000` and automatically restart on file changes.

### Production Mode

1. Build the project:

   ```
   npm run build
   ```

2. Start the production server:
   ```
   npm start
   ```
   The server will run on `http://localhost:3000`.

Visit `http://localhost:3000` in your browser to see the "Hello World" message.

## Project Structure

```
.
├── src/
│   └── app.ts          # Main application file
├── dist/               # Compiled JavaScript (generated on build)
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
└── README.md           # This file
```

## Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Run the compiled app (production)
- `npm run dev` - Run with Nodemon and ts-node for development

## Dependencies

- **express**: Web framework
- **typescript**: TypeScript compiler
- **ts-node**: Run TypeScript directly
- **nodemon**: Hot-reloading for development
- **@types/**: Type definitions for Express and Node.js

## License

ISC
