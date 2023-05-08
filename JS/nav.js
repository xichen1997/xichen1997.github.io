// main.js



// get root URL
function getRootURL() {
    const { protocol, host } = window.location;
    return `${protocol}//${host}/`;
}

function loadCSSFile(filename) {
    const rootURL = getRootURL();
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = rootURL + filename;
    document.head.appendChild(link);
}

loadCSSFile('/css/style.css');

// nav.js
document.addEventListener('DOMContentLoaded', () => {
    const navbarContainer = document.getElementById('navbar');
    const navbarPath = '/navbar.html';

    fetch(navbarPath)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(data => {
            navbarContainer.innerHTML = data;
            navbarContainer.addEventListener('click', handleNavLinkClick);
        })
        .catch(error => {
            console.error('Error fetching navbar:', error);
        });
});

function handleNavLinkClick(event) {
    const link = event.target.closest('a[data-href]');
    if (link) {
        event.preventDefault();
        const href = link.getAttribute('data-href');
        window.location.href = href;
    }
}
