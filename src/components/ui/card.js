// Shadcn Card Component for Vanilla JS

const cardClasses = "rounded-lg border bg-card text-card-foreground shadow-sm";
const cardHeaderClasses = "flex flex-col space-y-1.5 p-6";
const cardTitleClasses = "text-2xl font-semibold leading-none tracking-tight";
const cardDescriptionClasses = "text-sm text-muted-foreground";
const cardContentClasses = "p-6 pt-0";
const cardFooterClasses = "flex items-center p-6 pt-0";

// Utility functions to create card elements
export function createCard({ className = "", children, ...props }) {
  const card = document.createElement('div');
  card.className = cn(cardClasses, className);
  
  if (typeof children === 'string') {
    card.innerHTML = children;
  } else if (Array.isArray(children)) {
    children.forEach(child => {
      if (typeof child === 'string') {
        card.innerHTML += child;
      } else if (child instanceof Node) {
        card.appendChild(child);
      }
    });
  } else if (children instanceof Node) {
    card.appendChild(children);
  }
  
  Object.keys(props).forEach(key => {
    card[key] = props[key];
  });
  
  return card;
}

export function createCardHeader({ className = "", children, ...props }) {
  const header = document.createElement('div');
  header.className = cn(cardHeaderClasses, className);
  
  if (typeof children === 'string') {
    header.innerHTML = children;
  } else if (children instanceof Node) {
    header.appendChild(children);
  }
  
  return header;
}

export function createCardTitle({ className = "", children, ...props }) {
  const title = document.createElement('h3');
  title.className = cn(cardTitleClasses, className);
  
  if (typeof children === 'string') {
    title.textContent = children;
  }
  
  return title;
}

export function createCardDescription({ className = "", children, ...props }) {
  const description = document.createElement('p');
  description.className = cn(cardDescriptionClasses, className);
  
  if (typeof children === 'string') {
    description.textContent = children;
  }
  
  return description;
}

export function createCardContent({ className = "", children, ...props }) {
  const content = document.createElement('div');
  content.className = cn(cardContentClasses, className);
  
  if (typeof children === 'string') {
    content.innerHTML = children;
  } else if (children instanceof Node) {
    content.appendChild(children);
  }
  
  return content;
}

export function createCardFooter({ className = "", children, ...props }) {
  const footer = document.createElement('div');
  footer.className = cn(cardFooterClasses, className);
  
  if (typeof children === 'string') {
    footer.innerHTML = children;
  } else if (children instanceof Node) {
    footer.appendChild(children);
  }
  
  return footer;
}

// For use in vanilla JS/HTML
if (typeof window !== 'undefined') {
  window.createCard = createCard;
  window.createCardHeader = createCardHeader;
  window.createCardTitle = createCardTitle;
  window.createCardDescription = createCardDescription;
  window.createCardContent = createCardContent;
  window.createCardFooter = createCardFooter;
}