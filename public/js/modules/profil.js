if (window.location.pathname === "/profil") {
    document.getElementById('photoInput').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toastr.error('Please select an image file');
            return;
        }

        const formData = new FormData();
        formData.append('photo', file);

        try {
            const response = await fetch('profil/update-photo', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                toastr.success('Photo updated successfully');
                setTimeout(() => window.location.reload(), 1500);
            } else {
                toastr.error(result.message || 'Failed to update photo');
            }
        } catch (error) {
            console.error('Error:', error);
            toastr.error('An error occurred while updating the photo');
        }
    });

    const changePasswordCheckbox = document.getElementById('changePassword');
    const passwordFields = document.getElementById('passwordFields');
    const passwordInputs = passwordFields.querySelectorAll('input[type="password"]');

    changePasswordCheckbox.addEventListener('change', (e) => {
        passwordFields.style.display = e.target.checked ? 'block' : 'none';
        passwordInputs.forEach(input => {
            input.disabled = !e.target.checked;
            if (!e.target.checked) {
                input.value = '';
                input.classList.remove('is-invalid');
            }
        });
    });

    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        e.target.querySelectorAll('.is-invalid').forEach(el => {
            el.classList.remove('is-invalid');
        });

        let isValid = true;
        const username = document.getElementById('username');
        const email = document.getElementById('email');
        const currentPassword = document.getElementById('currentPassword');
        const newPassword = document.getElementById('newPassword');
        const confirmPassword = document.getElementById('confirmPassword');

        if (username.value.length < 3) {
            username.classList.add('is-invalid');
            isValid = false;
        }

        if (!email.value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            email.classList.add('is-invalid');
            isValid = false;
        }

        if (changePasswordCheckbox.checked) {
            if (!currentPassword.value) {
                currentPassword.classList.add('is-invalid');
                isValid = false;
            }

            if (newPassword.value.length < 8) {
                newPassword.classList.add('is-invalid');
                isValid = false;
            }

            if (newPassword.value !== confirmPassword.value) {
                confirmPassword.classList.add('is-invalid');
                isValid = false;
            }
        }

        if (!isValid) {
            toastr.error('Please check the form for errors');
            return;
        }

        const formData = {
            username: username.value,
            email: email.value,
            currentPassword: changePasswordCheckbox.checked ? currentPassword.value : '',
            newPassword: changePasswordCheckbox.checked ? newPassword.value : ''
        };

        try {
            const response = await fetch('profil/update-profil', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok) {
                toastr.success('Profile updated successfully');
                setTimeout(() => window.location.reload(), 1500);
            } else {
                toastr.error(result.message || 'Failed to update profile');
                if (result.message.includes('password')) {
                    currentPassword.classList.add('is-invalid');
                }
            }
        } catch (error) {
            console.error('Error:', error);
            toastr.error('An error occurred while updating the profile');
        }
    });

    document.querySelector('button[type="reset"]').addEventListener('click', () => {
        setTimeout(() => {
            changePasswordCheckbox.checked = false;
            passwordFields.style.display = 'none';
            passwordInputs.forEach(input => {
                input.disabled = true;
                input.value = '';
                input.classList.remove('is-invalid');
            });
            document.querySelectorAll('.is-invalid').forEach(el => {
                el.classList.remove('is-invalid');
            });
        }, 0);
    });
}