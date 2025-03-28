const markdownpdf = require('markdown-pdf');
const fs = require('fs');
const path = require('path');

// Configurações do PDF
const options = {
    cssPath: path.join(__dirname, 'manual-style.css'),
    remarkable: {
        html: true,
        breaks: true,
        plugins: ['remarkable-meta']
    },
    paperFormat: 'A4',
    paperOrientation: 'portrait',
    paperBorder: '1cm',
    runningsPath: path.join(__dirname, 'runnings.js')
};

// Caminho dos arquivos
const inputFile = path.join(__dirname, 'manual-studio-delas.md');
const outputFile = path.join(__dirname, 'Manual-Studio-Delas.pdf');

// Gerar o PDF
console.log('Gerando PDF...');
markdownpdf(options)
    .from(inputFile)
    .to(outputFile, function () {
        console.log('PDF gerado com sucesso:', outputFile);
    }); 