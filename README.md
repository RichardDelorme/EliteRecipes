EliteRecipes – Personalized Weekly Meal Planner

This project is my final Capstone website for the Mobile & Web Developer program.

Live site: https://richarddelorme.github.io/EliteRecipes/  

EliteRecipes is a responsive web app that helps users generate a personalized 7-day meal plan** based on their dietary preferences. It then builds a combined shopping list for the week and allows the user to download it as a CSV.

---

Features

1. Personalized Weekly Meal Plan
- User can select up to three dietary preferences (Keto, Vegetarian, High Protein, Lactose-Free, Mediterranean, etc.).
- The app generates a 7-day plan with:
  - Breakfast
  - Lunch
  - Dinner
- Each day’s meals are chosen from a catalog of 33 recipes stored in a JSON file.

2. Recipe Details
- Clicking any meal card opens a modal window with:
  - Dish image
  - Description
  - Calories and servings
  - Full ingredient list
  - Step-by-step cooking instructions

3. Shopping List Generator
- Lists ingredients from the entire 7-day plan.
- Merges duplicate ingredients and sums quantities.
- Opens a print-friendly shopping list in a new window.
- Also downloads a CSV file (`shopping-list.csv`) for use in Excel or Google Sheets.

4. Persistence
- The selected preferences and generated weekly plan are saved using localStorage.
- When the user returns, the previous plan is automatically restored.

5. Responsive Design
- Built with semantic HTML, custom CSS, and a simple layout system.
- Tested on desktop and mobile viewports.
- Navigation works on smaller screens.

---

Technologies Used

- HTML5 – structure and semantic layout
- CSS3 – custom styling, responsive layout
- JavaScript (ES6) – logic for:
  - Loading recipe data from `assets/recipes.json`
  - Generating the weekly plan
  - Building the shopping list
  - Handling the recipe modal
  - Form validation on the Contact page
- JSON – recipe catalog (33 recipes with metadata)
- Git & GitHub – version control
- GitHub Pages – hosting the live site

---

Project Structure

EliteRecipes/
  - index.html        // Home page – meal planner UI
  - projects.html     // Projects page – showcases EliteRecipes + Android app
  - contact.html      // Contact form with JavaScript validation
  - styles.css        // Global styles
  - app.js            // Main JavaScript logic
  - assets/
    - recipes.json    // Recipe data source
    - er-logo.png     // Logo
    - ...             // Screenshots and images
