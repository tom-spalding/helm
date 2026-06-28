// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Detach from the controlling terminal when launched from a shell so the
// prompt is returned immediately and Ctrl-C doesn't kill the app. Must run
// before any GUI/thread initialization, because fork() after GTK/AppKit/WebView
// startup is unsafe.
#[cfg(all(unix, not(debug_assertions)))]
fn detach_from_terminal() {
    unsafe {
        // Only detach when actually launched from a terminal. Finder, Dock,
        // Spotlight, .desktop, and `open -a` launches have no TTY and are
        // left untouched.
        let from_tty = libc::isatty(libc::STDIN_FILENO) == 1
            || libc::isatty(libc::STDOUT_FILENO) == 1
            || libc::isatty(libc::STDERR_FILENO) == 1;
        if !from_tty {
            return;
        }

        match libc::fork() {
            -1 => return,        // fork failed: stay in the foreground
            0 => {}              // child: continues as the app
            _ => libc::_exit(0), // parent: returns the shell prompt
        }

        libc::setsid(); // new session, detached from the controlling TTY

        let devnull = libc::open(
            b"/dev/null\0".as_ptr() as *const libc::c_char,
            libc::O_RDWR,
        );
        if devnull >= 0 {
            libc::dup2(devnull, libc::STDIN_FILENO);
            libc::dup2(devnull, libc::STDOUT_FILENO);
            libc::dup2(devnull, libc::STDERR_FILENO);
            if devnull > libc::STDERR_FILENO {
                libc::close(devnull);
            }
        }
    }
}

fn main() {
    #[cfg(all(unix, not(debug_assertions)))]
    detach_from_terminal();

    tauri_app_lib::run()
}
