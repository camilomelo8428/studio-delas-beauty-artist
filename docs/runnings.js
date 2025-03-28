exports.header = {
    height: '2cm',
    contents: function(pageNum, numPages) {
        return {
            left: 'Studio D\'Elas BEAUTY ARTIST',
            center: function() {
                if (pageNum <= 5) return 'Introdução';
                if (pageNum <= 15) return 'Área do Cliente';
                if (pageNum <= 25) return 'Área do Funcionário';
                if (pageNum <= 40) return 'Área do Administrador';
                return 'Suporte e Ajuda';
            }(),
            right: new Date().toLocaleDateString('pt-BR')
        };
    }
};

exports.footer = {
    height: '1cm',
    contents: function(pageNum, numPages) {
        return {
            left: '© 2024 Studio D\'Elas',
            center: 'Página ' + pageNum + ' de ' + numPages,
            right: 'v1.0'
        };
    }
}; 