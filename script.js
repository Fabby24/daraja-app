// Store selected plan details
let selectedPlanDetails = {
    plan: '',
    amount: 0
};

// Function to select a plan
function selectPlan(plan, amount) {
    selectedPlanDetails.plan = plan;
    selectedPlanDetails.amount = amount;
    
    document.getElementById('selectedPlan').textContent = plan;
    document.getElementById('selectedAmount').textContent = amount.toLocaleString();
    
    // Show modal
    document.getElementById('paymentModal').style.display = 'block';
}

// Function to close modal
function closeModal() {
    document.getElementById('paymentModal').style.display = 'none';
    document.getElementById('phoneNumber').value = '';
    document.getElementById('paymentStatus').style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('paymentModal');
    if (event.target === modal) {
        closeModal();
    }
}

// Handle payment form submission
document.getElementById('paymentForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const phoneNumber = document.getElementById('phoneNumber').value;
    const statusDiv = document.getElementById('paymentStatus');
    
    // Validate phone number
    if (!phoneNumber.match(/^254[0-9]{9}$/)) {
        statusDiv.className = 'payment-status error';
        statusDiv.textContent = 'Please enter a valid phone number (254XXXXXXXXX)';
        statusDiv.style.display = 'block';
        return;
    }
    
    // Show processing status
    statusDiv.className = 'payment-status processing';
    statusDiv.textContent = 'Processing payment... Please check your phone for M-Pesa prompt.';
    statusDiv.style.display = 'block';
    
    try {
        // Call your server endpoint to initiate Daraja API request
        const response = await fetch('/api/mpesa/stkpush', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                phoneNumber: phoneNumber,
                amount: selectedPlanDetails.amount,
                plan: selectedPlanDetails.plan
            })
        });
        
        const data = await response.json();
        
        if (data.ResponseCode === "0" || data.success) {
            statusDiv.className = 'payment-status success';
            statusDiv.textContent = 'Payment request sent! Please enter your M-Pesa PIN on your phone.';
            
            // Poll for payment status
            pollPaymentStatus(data.CheckoutRequestID);
        } else {
            statusDiv.className = 'payment-status error';
            statusDiv.textContent = 'Payment failed: ' + (data.ResponseDescription || data.message || 'Unknown error');
        }
    } catch (error) {
        console.error('Payment error:', error);
        statusDiv.className = 'payment-status error';
        statusDiv.textContent = 'An error occurred. Please try again.';
    }
});

// Function to poll payment status
async function pollPaymentStatus(checkoutRequestID) {
    const statusDiv = document.getElementById('paymentStatus');
    let attempts = 0;
    const maxAttempts = 20; // Poll for 2 minutes (6 seconds interval)
    
    const pollInterval = setInterval(async () => {
        attempts++;
        
        try {
            const response = await fetch(`/api/mpesa/status/${checkoutRequestID}`);
            const data = await response.json();
            
            if (data.status === 'completed') {
                clearInterval(pollInterval);
                statusDiv.className = 'payment-status success';
                statusDiv.textContent = 'Payment successful! Your WiFi access is now active.';
                
                // Optionally redirect or show voucher code
                setTimeout(() => {
                    if (data.voucherCode) {
                        alert('Your voucher code: ' + data.voucherCode);
                    }
                    closeModal();
                }, 3000);
            } else if (data.status === 'failed') {
                clearInterval(pollInterval);
                statusDiv.className = 'payment-status error';
                statusDiv.textContent = 'Payment failed. Please try again.';
            } else if (attempts >= maxAttempts) {
                clearInterval(pollInterval);
                statusDiv.className = 'payment-status error';
                statusDiv.textContent = 'Payment timeout. Please check your M-Pesa messages.';
            }
        } catch (error) {
            console.error('Status check error:', error);
        }
    }, 6000); // Check every 6 seconds
}

// Format phone number as user types
document.getElementById('phoneNumber').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    
    // Auto-add 254 prefix if user starts with 0 or 7
    if (value.startsWith('0')) {
        value = '254' + value.substring(1);
    } else if (value.startsWith('7') && value.length <= 9) {
        value = '254' + value;
    }
    
    e.target.value = value;
});