document.addEventListener("DOMContentLoaded", function () {
  // Getting the span element
  var dayTitleSpan = document.getElementById("DayTitle");

  // Getting the current day's name
  var days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  var currentDate = new Date();
  var currentDayName = days[currentDate.getDay()];

  // Setting the text
  dayTitleSpan.textContent = currentDayName + "'s Dining Hall Menu";
});

document.addEventListener("DOMContentLoaded", function () {
  // Get current day's name
  var days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  var currentDate = new Date();
  var currentDayName = days[currentDate.getDay()];

  function fetchAndDisplayMeal(mealType, containerClass) {
    fetch("assets/menu.json")
      .then((response) => response.json())
      .then((menu) => {
        let todayMenu = menu[currentDayName];
        let mealData = todayMenu[mealType];
        let mealTypeContent =
          '<div class="MenuMealType">' + mealType + "</div> <hr></hr>";
        let itemsContainer = '<div class="MenuItemsContainer">';

        for (let item in mealData) {
          if (typeof mealData[item] === "object") {
            for (let subitem in mealData[item]) {
              itemsContainer += `
                                <div class="MenuItem">
                                    <div class="MenuItemType">${subitem}</div>
                                    <div class="MenuFoodItem">${mealData[item][subitem]}</div>
                                </div>
                            `;
            }
          } else {
            itemsContainer += `
                            <div class="MenuItem">
                                <div class="MenuItemType">${item}</div>
                                <div class="MenuFoodItem">${mealData[item]}</div>
                            </div>
                        `;
          }
        }

        itemsContainer += "</div>"; // Close the MenuItemsContainer

        let htmlContent = mealTypeContent + itemsContainer;
        document.querySelector(containerClass).innerHTML = htmlContent;
      })
      .catch((error) => {
        console.error(`Error fetching the ${mealType} menu:`, error);
      });
  }

  fetchAndDisplayMeal("Breakfast", ".MenuBreakfast");
  fetchAndDisplayMeal("Lunch", ".MenuLunch");
  fetchAndDisplayMeal("Dinner", ".MenuDinner");
  fetchAndDisplayMeal("Dessert", ".MenuDessert");
});

document.addEventListener("DOMContentLoaded", function () {
  const scrollingTextSpan = document.querySelector(".ScrollingText span");

  function setAnimationDuration() {
    // Get half the width since the text is duplicated
    const spanWidth = scrollingTextSpan.offsetWidth / 2;
    const duration = (spanWidth / 30) * 0.2; // 0.2s for every 100px of text width
    scrollingTextSpan.style.animationDuration = duration + "s";
  }

  setAnimationDuration();

  // Restart the animation when it ends to simulate an infinite scroll
  scrollingTextSpan.addEventListener("animationiteration", () => {
    setAnimationDuration();
  });
});
