document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('urlInput');
    const generateBtn = document.getElementById('generateBtn');
    const contentWrapper = document.getElementById('contentWrapper');
    const qrContainer = document.getElementById('qrContainer');
    const qrcodeElement = document.getElementById('qrcode');
    const title = document.querySelector('.title');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const toast = document.getElementById('toast');
    
    // History Elements
    const historyList = document.getElementById('historyList');
    const emptyHistory = document.getElementById('emptyHistory');
    let qrHistory = JSON.parse(localStorage.getItem('qrHistory') || '[]');

    let qrcode = null;

    // Render History to Sidebar
    const renderHistory = () => {
        const items = historyList.querySelectorAll('.history-item');
        items.forEach(item => item.remove());

        if (qrHistory.length === 0) {
            emptyHistory.style.display = 'block';
            return;
        }

        emptyHistory.style.display = 'none';

        qrHistory.forEach((item) => {
            const li = document.createElement('li');
            li.className = 'history-item';
            
            const urlDiv = document.createElement('div');
            urlDiv.className = 'history-url';
            urlDiv.textContent = item.url;
            
            const dateDiv = document.createElement('div');
            dateDiv.className = 'history-date';
            
            const date = new Date(item.timestamp);
            dateDiv.textContent = date.toLocaleString('ko-KR', { 
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
            });

            li.appendChild(urlDiv);
            li.appendChild(dateDiv);
            
            li.addEventListener('click', () => {
                urlInput.value = item.url;
                generateQR(item.url, false); // false means don't add duplicate to history
            });

            historyList.appendChild(li);
        });
    };

    // Save to Local Storage History
    const saveToHistory = (url) => {
        qrHistory = qrHistory.filter(item => item.url !== url); // Remove duplicate
        qrHistory.unshift({
            url: url,
            timestamp: new Date().toISOString()
        });
        
        if (qrHistory.length > 20) {
            qrHistory.pop(); // Keep max 20 items
        }
        
        localStorage.setItem('qrHistory', JSON.stringify(qrHistory));
        renderHistory();
    };

    // Toast Notification
    const showToast = (msg) => {
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    };

    // Generate QR Logic
    const errorMsg = document.getElementById('errorMessage');

    const hideError = () => {
        errorMsg.classList.remove('show');
    };

    const showError = () => {
        errorMsg.classList.add('show');
        urlInput.parentElement.style.transform = 'translateX(-10px)';
        setTimeout(() => urlInput.parentElement.style.transform = 'translateX(10px)', 100);
        setTimeout(() => urlInput.parentElement.style.transform = 'translateX(0)', 200);
    };

    // Generate QR Logic
    const generateQR = async (inputUrl, addToHistory = true) => {
        let url = inputUrl || urlInput.value.trim();
        
        if (!url) {
            urlInput.focus();
            showError();
            return;
        }

        if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
        }

        urlInput.value = url;

        // Basic host check
        try {
            const parsed = new URL(url);
            if (!parsed.hostname.includes('.')) throw new Error('Invalid host');
        } catch(e) {
            showError();
            return;
        }

        // Check if site is reachable (fetch throws error if DNS resolution fails)
        try {
            const originalText = generateBtn.textContent;
            generateBtn.textContent = '확인중...';
            generateBtn.disabled = true;

            await fetch(url, { mode: 'no-cors' });
            
            generateBtn.textContent = originalText;
            generateBtn.disabled = false;
            hideError();
        } catch (err) {
            // Fetch failed, probably doesn't exist
            generateBtn.textContent = '생성하기';
            generateBtn.disabled = false;
            showError();
            return;
        }

        if (qrcode) {
            qrcodeElement.innerHTML = '';
        }

        qrcode = new QRCode(qrcodeElement, {
            text: url,
            width: 250,
            height: 250,
            colorDark : "#0f172a",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });

        if (addToHistory) {
            saveToHistory(url);
        }

        title.classList.add('hidden');
        contentWrapper.classList.add('generated');
        qrContainer.classList.add('show');
        qrContainer.classList.remove('hidden');
    };

    generateBtn.addEventListener('click', () => generateQR());
    
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            generateQR();
        }
    });

    // Helper: Draw padded white background canvas
    const getPaddedCanvas = () => {
        const canvas = qrcodeElement.querySelector('canvas');
        if (!canvas) return null;

        const downloadCanvas = document.createElement('canvas');
        const padding = 20;
        downloadCanvas.width = canvas.width + (padding * 2);
        downloadCanvas.height = canvas.height + (padding * 2);
        
        const ctx = downloadCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, downloadCanvas.width, downloadCanvas.height);
        ctx.drawImage(canvas, padding, padding);
        return downloadCanvas;
    };

    // Image Copy Logic (Clipboard API)
    copyBtn.addEventListener('click', async () => {
        const canvas = getPaddedCanvas();
        if (!canvas) return;

        canvas.toBlob(async (blob) => {
            try {
                const item = new ClipboardItem({ 'image/png': blob });
                await navigator.clipboard.write([item]);
                showToast('QR 코드 이미지가 클립보드에 복사되었습니다!');
            } catch (err) {
                console.error('Copy failed', err);
                showToast('클립보드 복사에 실패했습니다.');
            }
        }, 'image/png');
    });

    // Image Download Logic
    const downloadJPG = () => {
        const canvas = getPaddedCanvas();
        if (canvas) {
            const urlData = canvas.toDataURL('image/jpeg', 1.0);
            const link = document.createElement('a');
            link.download = 'qrcode.jpg';
            link.href = urlData;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            const img = qrcodeElement.querySelector('img');
            if (img && img.src) {
                const link = document.createElement('a');
                link.download = 'qrcode.png';
                link.href = img.src;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        }
    };

    downloadBtn.addEventListener('click', downloadJPG);
    qrcodeElement.addEventListener('click', () => {
        const url = urlInput.value.trim();
        if (url) {
            window.open(url, '_blank');
        }
    });

    // Dynamic Gradient Tracking Mouse
    document.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth) * 100;
        const y = (e.clientY / window.innerHeight) * 100;
        document.documentElement.style.setProperty('--mouse-x', `${x}%`);
        document.documentElement.style.setProperty('--mouse-y', `${y}%`);
    });

    // Initial load
    renderHistory();
});
