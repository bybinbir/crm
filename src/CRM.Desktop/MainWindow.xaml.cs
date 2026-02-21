using Microsoft.Extensions.DependencyInjection;
using System.Windows;
using CRM.Desktop.ViewModels;

namespace CRM.Desktop;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
        DataContext = App.Services.GetRequiredService<MainViewModel>();
    }
}
