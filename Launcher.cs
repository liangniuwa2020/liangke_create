using System;
using System.IO;
using System.Net;
using System.Diagnostics;
using System.Threading;

namespace MojiWeatherApp
{
    class Program
    {
        private static HttpListener _listener;
        private static string _distDir;
        private static bool _running = true;

        [STAThread]
        static void Main(string[] args)
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            _distDir = Path.Combine(baseDir, "dist");
            if (!Directory.Exists(_distDir))
            {
                _distDir = baseDir; // fallback
            }

            int port = 18999;
            string url = "http://127.0.0.1:" + port + "/";

            try
            {
                _listener = new HttpListener();
                _listener.Prefixes.Add(url);
                _listener.Start();

                Thread serverThread = new Thread(RunServer);
                serverThread.IsBackground = true;
                serverThread.Start();
            }
            catch (Exception ex)
            {
                // listener failed or port in use, continue
            }

            // Locate Edge or Chrome
            string browserPath = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
            if (!File.Exists(browserPath))
            {
                browserPath = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";
            }
            if (!File.Exists(browserPath))
            {
                browserPath = @"C:\Program Files\Google\Chrome\Application\chrome.exe";
            }

            string userDataDir = Path.Combine(Path.GetTempPath(), "MojiWeatherApp_Data");
            string arguments = string.Format("--app=\"{0}\" --window-size=440,920 --user-data-dir=\"{1}\" --app-id=moji_pure_weather", url, userDataDir);

            try
            {
                Process proc = new Process();
                proc.StartInfo.FileName = browserPath;
                proc.StartInfo.Arguments = arguments;
                proc.StartInfo.UseShellExecute = false;
                proc.Start();
                proc.WaitForExit();
            }
            catch (Exception)
            {
                // Fallback to default browser
                Process.Start(url);
            }
            finally
            {
                _running = false;
                if (_listener != null)
                {
                    try { _listener.Stop(); } catch { }
                }
            }
        }

        static void RunServer()
        {
            while (_running && _listener != null && _listener.IsListening)
            {
                try
                {
                    HttpListenerContext context = _listener.GetContext();
                    ThreadPool.QueueUserWorkItem((c) => HandleRequest((HttpListenerContext)c), context);
                }
                catch
                {
                    break;
                }
            }
        }

        static void HandleRequest(HttpListenerContext context)
        {
            try
            {
                string rawUrl = context.Request.Url.AbsolutePath;
                if (rawUrl == "/" || string.IsNullOrEmpty(rawUrl))
                {
                    rawUrl = "/index.html";
                }

                string relativePath = rawUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
                string filePath = Path.Combine(_distDir, relativePath);

                if (!File.Exists(filePath))
                {
                    filePath = Path.Combine(_distDir, "index.html");
                }

                if (!File.Exists(filePath))
                {
                    context.Response.StatusCode = 404;
                    context.Response.Close();
                    return;
                }

                byte[] buffer = File.ReadAllBytes(filePath);
                string ext = Path.GetExtension(filePath).ToLower();
                string contentType = "application/octet-stream";

                if (ext == ".html") contentType = "text/html; charset=utf-8";
                else if (ext == ".js") contentType = "application/javascript; charset=utf-8";
                else if (ext == ".css") contentType = "text/css; charset=utf-8";
                else if (ext == ".json") contentType = "application/json; charset=utf-8";
                else if (ext == ".png") contentType = "image/png";
                else if (ext == ".jpg" || ext == ".jpeg") contentType = "image/jpeg";
                else if (ext == ".ico") contentType = "image/x-icon";
                else if (ext == ".ttf") contentType = "font/ttf";
                else if (ext == ".svg") contentType = "image/svg+xml";

                context.Response.ContentType = contentType;
                context.Response.ContentLength64 = buffer.Length;
                context.Response.OutputStream.Write(buffer, 0, buffer.Length);
                context.Response.OutputStream.Close();
            }
            catch
            {
                try { context.Response.Close(); } catch { }
            }
        }
    }
}
