// main.js
document.addEventListener('DOMContentLoaded', () => {
    const navbarContainer = document.getElementById('navbar');

    fetch('Pages/navbar.html')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(data => {
            navbarContainer.innerHTML = data;
        })
        .catch(error => {
            console.error('Error fetching navbar:', error);
        });
});
