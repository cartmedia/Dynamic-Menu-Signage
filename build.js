#!/usr/bin/env node

// Simple build script to compile Tailwind CSS and copy components
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Building Team Pinas Signage UI...');

// Ensure output directory exists
const outputDir = path.join(__dirname, 'public/dist');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

try {
  // Build Tailwind CSS
  console.log('📦 Building Tailwind CSS...');
  execSync('npx tailwindcss -i ./src/styles/globals.css -o ./public/dist/styles.css --watch=false', {
    stdio: 'inherit',
    cwd: __dirname
  });

  // Copy utility files
  console.log('📋 Copying utility files...');
  
  // Copy utils.js (convert to vanilla JS)
  const utilsContent = `
// Utility functions for className management
function clsx(...inputs) {
  return inputs
    .flat()
    .filter(Boolean)
    .join(' ');
}

function twMerge(...inputs) {
  // Simple implementation - in production you'd use the real twMerge
  return clsx(inputs);
}

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Make available globally
window.clsx = clsx;
window.twMerge = twMerge;
window.cn = cn;
`;
  
  fs.writeFileSync(path.join(outputDir, 'utils.js'), utilsContent);

  // Copy and modify button component for vanilla JS
  const buttonContent = `
// Shadcn Button Component for Vanilla JS
const buttonVariants = {
  variant: {
    default: "bg-blue-600 text-white shadow hover:bg-blue-700",
    destructive: "bg-red-600 text-white shadow hover:bg-red-700",
    outline: "border border-gray-300 bg-white shadow hover:bg-gray-50",
    secondary: "bg-gray-100 text-gray-900 shadow hover:bg-gray-200",
    ghost: "hover:bg-gray-100",
    link: "text-blue-600 underline hover:no-underline",
  },
  size: {
    default: "h-10 px-4 py-2",
    sm: "h-9 px-3",
    lg: "h-11 px-8",
    icon: "h-10 w-10",
  }
};

function getButtonClasses(variant = "default", size = "default", className = "") {
  const baseClasses = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
  const variantClass = buttonVariants.variant[variant] || buttonVariants.variant.default;
  const sizeClass = buttonVariants.size[size] || buttonVariants.size.default;
  
  return cn(baseClasses, variantClass, sizeClass, className);
}

window.getButtonClasses = getButtonClasses;
`;

  fs.writeFileSync(path.join(outputDir, 'button.js'), buttonContent);

  console.log('✅ Build complete!');
  console.log('📁 Output files:');
  console.log('   - public/dist/styles.css (Compiled Tailwind CSS)');
  console.log('   - public/dist/utils.js (Utility functions)');
  console.log('   - public/dist/button.js (Button component)');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}