# Team Pinas Signage 🍽️

## Overview 📝

This project provides a digital menu signage for Team Pinas. It uses HTML, CSS, and JavaScript to present an attractive, readable, and automatically updating menu board suitable for TV/monitor displays. Menu data is stored in JSON for easy maintenance.

## Features 🌟

- **Dynamic Display**: Automatically cycles through categories and paginates long lists.
- **Live Clock**: Two-line NL locale time and date, aligned with branding.
- **Responsive Design**: Optimized for 16:9 screens with viewport units (vh).
- **Readable From Distance**: Enlarged typography and increased letter-spacing; tabular numerals for prices.
- **Easy Maintenance**: Menu items and prices are stored in JSON.

## Tools & Technologies 🛠️

- **Design**: Figma, Adobe Illustrator, Adobe Photoshop
- **Development**: HTML, CSS, JavaScript
- **Data Management**: JSON

## Project Structure 📁

- `index.html`: Main HTML document and includes the clock and layout containers.
- `css/MenuSignage.css`: Styling for the layout, clock, and menu components.
- `js/MenuSignage.js`: Logic for live clock, dynamic rendering, and rotation.
- `assets/`: Logos, background, and JSON data (e.g., `products.json`).

## Challenges & Solutions 🧠

- **Screen Glare**: Dark theme with gold accents improves contrast and readability.
- **Responsive Design**: Uses `vh` and flexible containers for consistent scaling on 16:9 displays.

## Updates & Iterations 🔄

Recent updates include a two-line NL locale clock, increased letter-spacing for distance legibility, and tabular numerals for price alignment.

## Viewing the Menu 📺

Open `index.html` in a modern browser on the signage display. Configure data in `assets/products.json`.

## How to Contribute 🤝

Contributions and suggestions are welcome. Please open an issue or PR in this repository.

## Acknowledgements 🙏

Special thanks to [ResourceBoy](https://resourceboy.com/textures/) for the chalkboard textured backgrounds and [Freepik](https://www.freepik.com/) for the artisanal chalk styled food graphics that significantly enhanced the visual appeal of the menu.

## License 📜

This project is licensed under the MIT License - see the LICENSE file for details.
