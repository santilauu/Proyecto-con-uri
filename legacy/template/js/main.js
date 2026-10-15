document.addEventListener('DOMContentLoaded', () => {
    // Inicialización de íconos Lucide
    if (window.lucide) {
        lucide.createIcons();
    }

    // Lógica para acordeón interactivo FAQ
    const faqButtons = document.querySelectorAll('.faq-question');
    
    faqButtons.forEach(button => {
        button.addEventListener('click', () => {
            const answer = button.nextElementSibling;
            const isOpen = answer.classList.contains('active');
            
            // Cerrar todas las respuestas
            document.querySelectorAll('.faq-answer').forEach(el => el.classList.remove('active'));
            
            // Alternar estado
            if (!isOpen) {
                answer.classList.add('active');
            }
        });
    });

    console.log("⚡ Prototipo interactivo cargado correctamente.");
});