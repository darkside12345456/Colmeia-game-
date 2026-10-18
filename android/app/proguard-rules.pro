# Regras R8/ProGuard para a Colmeia Doce (Capacitor).
# O Capacitor encontra os plugins por reflexão: não podem ser renomeados.
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * {
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.annotation.Permission <methods>;
    @com.getcapacitor.PluginMethod public <methods>;
}
-keep public class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
# Plugins usados
-keep class com.getcapacitor.community.admob.** { *; }
-keep class com.revenuecat.purchases.** { *; }
-keep class com.capacitorjs.plugins.** { *; }
# Google Mobile Ads / UMP e Play Billing trazem as suas próprias regras (consumer rules).
-dontwarn com.google.android.gms.**
# Manter números de linha nos relatórios de erros, sem expor nomes originais
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
